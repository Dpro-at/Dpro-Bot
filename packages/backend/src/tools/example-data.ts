import {z} from 'zod';
import type {ToolResult} from './types.js';

// Examples and integration assertions consume unknown JSON, just like a tool client.
const dataSchema=z.object({
 success:z.boolean().optional(),path:z.string().optional(),title:z.string().optional(),url:z.string().optional(),finalUrl:z.string().optional(),
 screenshot:z.string().optional(),fullPage:z.boolean().optional(),viewport:z.object({width:z.number(),height:z.number()}).optional(),
 linkCount:z.number().optional(),links:z.array(z.object({href:z.string().optional(),text:z.string().optional(),url:z.string().optional()}).passthrough()).optional(),
 metadata:z.object({title:z.string().optional(),description:z.string().nullable().optional(),keywords:z.array(z.string()).optional(),canonical:z.string().optional(),language:z.string().optional(),favicon:z.string().optional()}).passthrough().optional(),actionsPerformed:z.number().optional(),
 type:z.string().optional(),importance:z.number().optional(),layer:z.string().optional(),memoryId:z.string().optional(),count:z.number().optional(),
 memories:z.array(z.object({id:z.string().optional(),content:z.string().optional(),type:z.string().optional(),importance:z.number().optional(),layer:z.string().optional(),tags:z.array(z.string()).optional()}).passthrough()).optional(),
}).passthrough();
export function exampleData(result:ToolResult){return dataSchema.parse(result.data??{});}
