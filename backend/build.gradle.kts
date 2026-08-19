import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    kotlin("jvm") version "2.0.21"
    kotlin("plugin.jpa") version "2.0.21"
    kotlin("plugin.spring") version "2.0.21"
    id("org.springframework.boot") version "3.3.5"
    id("io.spring.dependency-management") version "1.1.6"
}

group = "com.example"
version = "0.1.0"

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

val typeSpecOutputDir = layout.buildDirectory.dir("generated/typespec")
val openApiSpec = typeSpecOutputDir.map { it.file("@typespec/openapi3/openapi.yaml") }
val kotlinApiOutputDir = layout.buildDirectory.dir("generated/typespec-kotlin")
val nodeExecutable = providers.environmentVariable("NODE_BINARY").orElse(
    providers.provider {
        listOf(
            "/opt/homebrew/bin/node",
            "/usr/local/bin/node",
            "node",
        ).first { candidate -> candidate == "node" || file(candidate).canExecute() }
    },
)

dependencies {
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-web")
    runtimeOnly("com.h2database:h2")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
}

val compileTypeSpec by tasks.registering(Exec::class) {
    description = "Compiles api/main.tsp into an OpenAPI document used by backend code generation."
    group = "openapi tools"

    val typeSpecBin = rootProject.layout.projectDirectory.file("node_modules/.bin/tsp")
    val apiDir = rootProject.layout.projectDirectory.dir("api")

    inputs.dir(apiDir)
    inputs.file(rootProject.layout.projectDirectory.file("package-lock.json"))
    outputs.dir(typeSpecOutputDir)

    commandLine(
        typeSpecBin.asFile.absolutePath,
        "compile",
        apiDir.asFile.absolutePath,
        "--emit",
        "@typespec/openapi3",
        "--output-dir",
        typeSpecOutputDir.get().asFile.absolutePath,
    )
}

val generateKotlinApi by tasks.registering(Exec::class) {
    description = "Generates Kotlin Spring API interfaces and DTOs from the TypeSpec-produced OpenAPI document."
    group = "openapi tools"

    dependsOn(compileTypeSpec)

    val generator = layout.projectDirectory.file("tools/generate-kotlin-api.mjs")

    inputs.file(openApiSpec)
    inputs.file(generator)
    outputs.dir(kotlinApiOutputDir)

    commandLine(
        nodeExecutable.get(),
        generator.asFile.absolutePath,
        openApiSpec.get().asFile.absolutePath,
        kotlinApiOutputDir.get().asFile.absolutePath,
    )
}

kotlin {
    sourceSets {
        main {
            kotlin.srcDir(kotlinApiOutputDir.map { it.dir("src/main/kotlin") })
        }
    }
}

tasks.withType<KotlinCompile>().configureEach {
    dependsOn(generateKotlinApi)
    compilerOptions {
        freeCompilerArgs.add("-Xjsr305=strict")
    }
}

tasks.withType<Test>().configureEach {
    useJUnitPlatform()
}
