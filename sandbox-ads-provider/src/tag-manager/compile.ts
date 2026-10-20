import type { Tag, Trigger, Variable } from "../generated/prisma/client.js";
import { conditionSchema, flatten, paramValue, parametersSchema, variableReferences, type Condition, type Parameter } from "./parameters.js";

export const TAG_TYPES = {
  awct: "Google Ads Conversion Tracking",
  gclidw: "Conversion Linker",
  html: "Custom HTML",
} as const;

export const TRIGGER_TYPES = {
  pageview: "gtm.js",
  domReady: "gtm.dom",
  windowLoaded: "gtm.load",
  linkClick: "gtm.linkClick",
  formSubmission: "gtm.formSubmit",
  customEvent: null,
} as const;

export const VARIABLE_TYPES = { v: "Data Layer Variable", u: "URL", c: "Constant", k: "1st-Party Cookie", j: "JavaScript Variable" } as const;

export const BUILT_IN_VARIABLES = [
  "Event",
  "_event",
  "Page URL",
  "Page Hostname",
  "Page Path",
  "Referrer",
  "Click Element",
  "Click URL",
  "Click Text",
  "Click ID",
  "Click Classes",
  "Form ID",
  "Form URL",
  "Form Classes",
] as const;

export type CompiledFilter = { type: Condition["type"]; arg0: string; arg1: string; negate: boolean; ignoreCase: boolean };
export type CompiledTrigger = { id: string; type: keyof typeof TRIGGER_TYPES; event: string | null; eventFilters: CompiledFilter[]; filters: CompiledFilter[] };
export type CompiledTag = { id: string; name: string; type: keyof typeof TAG_TYPES; params: Record<string, string>; firing: string[]; blocking: string[] };
export type CompiledVariable = { name: string; type: keyof typeof VARIABLE_TYPES; params: Record<string, string> };

/** What gtm.js runs: paused tags are left out. */
export type ContainerConfig = { tags: CompiledTag[]; triggers: CompiledTrigger[]; variables: CompiledVariable[] };

export type CompileResult = { ok: true; config: ContainerConfig } | { ok: false; errors: string[] };

/**
 * Validates a workspace and compiles it into the container config, like GTM's "compiler errors"
 * on Submit: unknown types, missing required fields, dangling trigger and variable references.
 */
export function compileWorkspace(tags: Tag[], triggers: Trigger[], variables: Variable[]): CompileResult {
  const errors: string[] = [];
  const variableNames = new Set<string>(BUILT_IN_VARIABLES);
  const references: { where: string; name: string }[] = [];
  const collect = (where: string, parameters: Parameter[]) => {
    for (const parameter of parameters) {
      if (parameter.value) for (const name of variableReferences(parameter.value)) references.push({ where, name });
      collect(where, [...(parameter.list ?? []), ...(parameter.map ?? [])]);
    }
  };

  const compiledVariables: CompiledVariable[] = [];
  for (const variable of variables) {
    const where = `Variable "${variable.name}"`;
    if (variableNames.has(variable.name)) errors.push(`${where}: the name is already used`);
    variableNames.add(variable.name);
    if (!(variable.type in VARIABLE_TYPES)) {
      errors.push(`${where}: unknown type ${variable.type}`);
      continue;
    }
    const parameters = parametersSchema.parse(variable.parameter);
    const required = { v: "name", k: "name", j: "name", c: "value", u: null }[variable.type as keyof typeof VARIABLE_TYPES];
    if (required && !paramValue(parameters, required)) errors.push(`${where}: parameter "${required}" is required`);
    collect(where, parameters);
    compiledVariables.push({ name: variable.name, type: variable.type as CompiledVariable["type"], params: flatten(parameters) });
  }

  const triggerIds = new Set(triggers.map((trigger) => String(trigger.id)));
  const compiledTriggers: CompiledTrigger[] = [];
  for (const trigger of triggers) {
    const where = `Trigger "${trigger.name}"`;
    if (!(trigger.type in TRIGGER_TYPES)) {
      errors.push(`${where}: unknown type ${trigger.type}`);
      continue;
    }
    const type = trigger.type as CompiledTrigger["type"];
    const filters = compileConditions(trigger.filter);
    const eventFilters = compileConditions(trigger.customEventFilter);
    if (type === "customEvent" && !eventFilters.length) errors.push(`${where}: a custom event trigger needs an event name filter`);
    for (const filter of [...filters, ...eventFilters]) {
      for (const name of [...variableReferences(filter.arg0), ...variableReferences(filter.arg1)]) references.push({ where, name });
    }
    compiledTriggers.push({ id: String(trigger.id), type, event: TRIGGER_TYPES[type], eventFilters, filters });
  }

  const compiledTags: CompiledTag[] = [];
  for (const tag of tags) {
    const where = `Tag "${tag.name}"`;
    if (!(tag.type in TAG_TYPES)) {
      errors.push(`${where}: unknown type ${tag.type}`);
      continue;
    }
    const parameters = parametersSchema.parse(tag.parameter);
    collect(where, parameters);
    const firing = tag.firingTriggerId.map(String);
    const blocking = tag.blockingTriggerId.map(String);
    for (const id of [...firing, ...blocking]) if (!triggerIds.has(id)) errors.push(`${where}: trigger ${id} does not exist`);
    if (tag.paused) continue;
    if (!firing.length) errors.push(`${where}: a tag needs at least one firing trigger`);
    if (tag.type === "awct") {
      for (const key of ["conversionId", "conversionLabel"]) if (!paramValue(parameters, key)) errors.push(`${where}: parameter "${key}" is required`);
    }
    if (tag.type === "html" && !paramValue(parameters, "html")) errors.push(`${where}: parameter "html" is required`);
    compiledTags.push({ id: String(tag.id), name: tag.name, type: tag.type as CompiledTag["type"], params: flatten(parameters), firing, blocking });
  }

  for (const { where, name } of references) {
    if (!variableNames.has(name)) errors.push(`${where}: unknown variable {{${name}}}`);
  }

  return errors.length ? { ok: false, errors: [...new Set(errors)] } : { ok: true, config: { tags: compiledTags, triggers: compiledTriggers, variables: compiledVariables } };
}

function compileConditions(raw: unknown): CompiledFilter[] {
  const conditions = conditionSchema.array().parse(raw ?? []);
  return conditions.map((condition) => ({
    type: condition.type,
    arg0: paramValue(condition.parameter, "arg0") ?? "",
    arg1: paramValue(condition.parameter, "arg1") ?? "",
    negate: paramValue(condition.parameter, "negate") === "true",
    ignoreCase: paramValue(condition.parameter, "ignore_case") === "true",
  }));
}
