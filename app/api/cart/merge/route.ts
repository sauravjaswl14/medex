import {NextRequest} from 'next/server';import {respond} from '@/lib/cart/http';import {mergeGuest} from '@/lib/cart/store';import {z} from 'zod';
const schema=z.object({items:z.array(z.object({productId:z.string(),quantity:z.number().int().min(1).max(99),wellnessPricingId:z.string().optional()}))});
export async function POST(req:NextRequest){return respond(req,async()=>mergeGuest(schema.parse(await req.json())))}
