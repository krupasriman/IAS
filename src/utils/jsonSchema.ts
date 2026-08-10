import { z } from "zod";
import { StructuredTopicSchema } from "./topicSchema.ts";

export const structuredTopicJsonSchema = z.toJSONSchema(StructuredTopicSchema);

export const structuredTopicSchemaString = JSON.stringify(
	structuredTopicJsonSchema,
	null,
	2,
);
