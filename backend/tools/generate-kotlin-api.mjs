import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

const [inputSpec, outputDir] = process.argv.slice(2);

if (!inputSpec || !outputDir) {
  console.error("Usage: node generate-kotlin-api.mjs <openapi.yaml> <output-dir>");
  process.exit(1);
}

const openApi = YAML.parse(fs.readFileSync(inputSpec, "utf8"));
const sourceRoot = path.join(outputDir, "src/main/kotlin");
const modelDir = path.join(sourceRoot, "com/example/calendar/generated/model");
const apiDir = path.join(sourceRoot, "com/example/calendar/generated/api");

fs.rmSync(outputDir, { force: true, recursive: true });
fs.mkdirSync(modelDir, { recursive: true });
fs.mkdirSync(apiDir, { recursive: true });

const schemas = openApi.components?.schemas ?? {};

for (const [name, schema] of Object.entries(schemas)) {
  writeFile(path.join(modelDir, `${name}.kt`), renderSchema(name, schema));
}

for (const [group, operations] of Object.entries(groupOperations(openApi.paths ?? {}))) {
  writeFile(path.join(apiDir, `${group}Api.kt`), renderApi(group, operations));
}

function writeFile(filePath, contents) {
  fs.writeFileSync(filePath, `${contents.trim()}\n`, "utf8");
}

function renderSchema(name, schema) {
  if (schema.enum) {
    return renderEnum(name, schema.enum);
  }

  const imports = new Set(["com.fasterxml.jackson.annotation.JsonProperty"]);
  const required = new Set(schema.required ?? []);
  const properties = Object.entries(schema.properties ?? {});

  const fields = properties.map(([propertyName, property]) => {
    const type = kotlinType(property);
    collectModelImports(imports, property);

    const annotations = [`@get:JsonProperty("${propertyName}")`];
    if (property.minimum !== undefined) {
      imports.add("jakarta.validation.constraints.Min");
      annotations.push(`@field:Min(${property.minimum})`);
    }
    if (property.$ref || property.items?.$ref) {
      imports.add("jakarta.validation.Valid");
      annotations.push("@field:Valid");
    }

    const nullable = required.has(propertyName) ? "" : "?";
    const defaultValue = required.has(propertyName) ? "" : " = null";

    return `    ${annotations.join("\n    ")}\n    val ${propertyName}: ${type}${nullable}${defaultValue}`;
  });

  return [
    "package com.example.calendar.generated.model",
    "",
    renderImports(imports),
    "",
    `data class ${name}(`,
    fields.join(",\n"),
    ")",
  ].filter(Boolean).join("\n");
}

function renderEnum(name, values) {
  const entries = values.map((value) => {
    return `    @JsonProperty("${value}")\n    ${enumConstant(value)}("${value}")`;
  });

  return `package com.example.calendar.generated.model

import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.annotation.JsonValue

enum class ${name}(@get:JsonValue val value: String) {
${entries.join(",\n")};

    companion object {
        @JvmStatic
        @JsonCreator
        fun fromValue(value: String): ${name} =
            entries.firstOrNull { it.value == value }
                ?: throw IllegalArgumentException("Unexpected ${name} value: $value")
    }
}`;
}

function groupOperations(paths) {
  const groups = {};

  for (const [route, pathItem] of Object.entries(paths)) {
    for (const method of ["get", "post", "put", "patch", "delete"]) {
      const operation = pathItem[method];
      if (!operation?.operationId) {
        continue;
      }

      const [group, rawName] = operation.operationId.split("_");
      groups[group] ??= [];
      groups[group].push({
        method,
        route,
        name: rawName,
        operation,
      });
    }
  }

  return groups;
}

function renderApi(group, operations) {
  const imports = new Set([
    "jakarta.validation.Valid",
    "org.springframework.http.ResponseEntity",
    "org.springframework.web.bind.annotation.GetMapping",
    "org.springframework.web.bind.annotation.PathVariable",
    "org.springframework.web.bind.annotation.PostMapping",
    "org.springframework.web.bind.annotation.RequestBody",
    "org.springframework.web.bind.annotation.RequestMapping",
  ]);

  const modelImports = new Set();
  const basePath = commonBasePath(operations.map((item) => item.route));
  const methods = operations.map((item) => renderApiMethod(item, basePath, modelImports));

  for (const model of modelImports) {
    imports.add(`com.example.calendar.generated.model.${model}`);
  }

  return [
    "package com.example.calendar.generated.api",
    "",
    renderImports(imports),
    "",
    `@RequestMapping("${basePath}")`,
    `interface ${group}Api {`,
    methods.join("\n\n"),
    "}",
  ].join("\n");
}

function renderApiMethod(item, basePath, modelImports) {
  const mapping = item.method === "post" ? "PostMapping" : "GetMapping";
  const route = relativeRoute(item.route, basePath);
  const returnType = operationReturnType(item.operation, item.method, modelImports);
  const parameters = [];

  for (const parameter of item.operation.parameters ?? []) {
    if (parameter.in !== "path") {
      continue;
    }
    parameters.push(`@PathVariable ${parameter.name}: ${kotlinType(parameter.schema)}`);
  }

  const requestSchema = item.operation.requestBody?.content?.["application/json"]?.schema;
  if (requestSchema) {
    const requestType = kotlinType(requestSchema);
    modelImports.add(requestType);
    parameters.push(`@Valid @RequestBody request: ${requestType}`);
  }

  const args = parameters.length === 0 ? "" : parameters.join(", ");
  return `    @${mapping}${route ? `("${route}")` : ""}\n    fun ${item.name}(${args}): ${returnType}`;
}

function operationReturnType(operation, method, modelImports) {
  const successCode = Object.keys(operation.responses ?? {}).find((code) => code.startsWith("2"));
  const schema = operation.responses?.[successCode]?.content?.["application/json"]?.schema;
  const type = schema ? kotlinType(schema) : "Unit";

  collectReturnImports(type, modelImports);

  return successCode === "201" || method !== "get" ? `ResponseEntity<${type}>` : type;
}

function collectReturnImports(type, modelImports) {
  const matches = type.match(/[A-Z][A-Za-z0-9_]*/g) ?? [];
  for (const match of matches) {
    if (schemas[match]) {
      modelImports.add(match);
    }
  }
}

function commonBasePath(routes) {
  const splitRoutes = routes.map((route) => route.split("/").filter(Boolean));
  const common = [];

  for (let index = 0; index < splitRoutes[0].length; index += 1) {
    const segment = splitRoutes[0][index];
    if (segment.startsWith("{") || splitRoutes.some((route) => route[index] !== segment)) {
      break;
    }
    common.push(segment);
  }

  return `/${common.join("/")}`;
}

function relativeRoute(route, basePath) {
  const relative = route.slice(basePath.length);
  return relative === "" ? "" : relative;
}

function collectModelImports(imports, schema) {
  if (schema.type === "string" && schema.format === "date-time") {
    imports.add("java.time.OffsetDateTime");
  }
  if (schema.type === "string" && schema.format === "date") {
    imports.add("java.time.LocalDate");
  }
  if (schema.type === "array") {
    collectModelImports(imports, schema.items ?? {});
  }
}

function kotlinType(schema) {
  if (schema.$ref) {
    return schema.$ref.split("/").at(-1);
  }
  if (schema.type === "array") {
    return `List<${kotlinType(schema.items)}>`;
  }
  if (schema.type === "integer") {
    return "Int";
  }
  if (schema.type === "string" && schema.format === "date-time") {
    return "OffsetDateTime";
  }
  if (schema.type === "string" && schema.format === "date") {
    return "LocalDate";
  }
  if (schema.type === "string") {
    return "String";
  }
  return "Any";
}

function enumConstant(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

function renderImports(imports) {
  return [...imports].sort().map((item) => `import ${item}`).join("\n");
}
