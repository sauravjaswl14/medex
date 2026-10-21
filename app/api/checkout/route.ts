import {NextRequest} from 'next/server';import {respond} from '@/lib/cart/http';import {checkout} from '@/lib/cart/store';import {checkoutSchema} from '@/lib/cart/model';
export async function POST(req:NextRequest){return respond(req,async()=>checkout(checkoutSchema.parse(await req.json())),201)}
