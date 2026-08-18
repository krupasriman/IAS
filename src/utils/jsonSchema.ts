import { z } from "zod";
import { StructuredTopicSchema } from "./topicSchema";

export const structuredTopicJsonSchema = z.toJSONSchema(StructuredTopicSchema);

export const structuredTopicSchemaString = JSON.stringify(
	structuredTopicJsonSchema,
	null,
	2,
);
