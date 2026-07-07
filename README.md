# langgraph4j-builder (generator)

A code generator that turns a **YAML / JSON graph definition** into a runnable
[LangGraph4j](https://github.com/langchain4j/langgraph4j) workflow scaffold (Java).

## What it does

- Reads a graph definition (nodes + edges, including conditional routing) from **stdin**.
- Generates `AgentWorkflowBuilder.java` plus a JUnit test from a Mustache template.
- The generated code wires nodes / edges into `org.bsc.langgraph4j.StateGraph`.

## Build

```bash
mvn package
```

Produces `target/generator-1.6-SNAPSHOT-jar-with-dependencies.jar`.

## Usage

```bash
java -jar target/generator-1.6-SNAPSHOT-jar-with-dependencies.jar < definition.yaml > AgentWorkflowBuilder.java
```

### Definition DSL

```yaml
name: CustomAgent
nodes:
  - name: model
  - name: tool
edges:
  - from: __start__
    to: model
  - from: tool
    to: model
  - from: model
    condition: route after reasoning
    paths: [tool, __end__]
```

## Project layout

- `src/main/java/org/bsc/langgraph4j/builder/` — `Generator` (entry point) + `GraphDefinition` (DSL model)
- `src/main/resources/template/` — Mustache templates and the Maven scaffold generated per workflow
- `examples/` — sample definitions

> This repository is developed autonomously by a multi-agent loop
> (issue -> worker / Claude Code -> pull request -> reviewer). See the generated
> pull requests for implementation context.
