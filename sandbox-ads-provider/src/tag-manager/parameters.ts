import { z } from "zod";

/** GTM API Parameter: typed key/value with nested lists and maps. */
export type Parameter = {
  type: "template" | "boolean" | "integer" | "list" | "map";
  key?: string;
  value?: string;
  list?: Parameter[];
  map?: Parameter[];
};

export const parameterSchema: z.ZodType<Parameter> = z.lazy(() =>
  z.object({
    type: z.enum(["template", "boolean", "integer", "list", "map"]),
    key: z.string().optional(),
    value: z.string().optional(),
    list: z.array(parameterSchema).optional(),
    map: z.array(parameterSchema).optional(),
  }),
);

export const parametersSchema = z.array(parameterSchema).default([]);

/** GTM Condition: { type: "equals", parameter: [{key:"arg0", value:"{{Page Path}}"}, {key:"arg1", value:"/thanks"}] } */
export const conditionSchema = z.object({
  type: z.enum(["equals", "contains", "startsWith", "endsWith", "matchRegex", "greater", "less"]),
  parameter: parametersSchema,
});

export type Condition = z.infer<typeof conditionSchema>;

export function paramValue(parameters: Parameter[], key: string): string | undefined {
  return parameters.find((parameter) => parameter.key === key)?.value;
}

/** Flattens template/boolean/integer parameters into a key → value map for the runtime. */
export function flatten(parameters: Parameter[]): Record<string, string> {
  return Object.fromEntries(
    parameters.filter((p) => p.key && p.value !== undefined && p.type !== "list" && p.type !== "map").map((p) => [p.key!, p.value!]),
  );
}

/** Every {{Variable Name}} referenced in a string. */
export function variableReferences(value: string): string[] {
  return [...value.matchAll(/\{\{([^}]+)\}\}/g)].map((match) => match[1]!.trim());
}
