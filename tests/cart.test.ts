import {describe,it,expect} from 'vitest';
import {checkoutEligible,summarize,unitPrice,Line} from '../lib/cart/model';
const line=(id:string,price:number|null,currency:string,quantity=1):Line=>({id,productId:id,quantity,product:{id,title:id,type:'lab_test',currency,price}});
describe('cart money and eligibility',()=>{
 it('never combines distinct currencies',()=>{const cart=summarize([line('a',100,'THB',2),line('b',500,'NPR')]);expect(cart.groups[0].subtotals).toEqual({THB:200,NPR:500});expect(cart.totalItems).toBe(3)});
 it('does not count missing prices as zero',()=>{const cart=summarize([line('a',null,'THB')]);expect(cart.groups[0].unpricedItems).toBe(1);expect(cart.groups[0].subtotals).toEqual({});expect(checkoutEligible(cart.groups[0])).toBe(false)});
 it('requires a valid wellness option',()=>{const l:Line={id:'a',productId:'w',quantity:2,product:{id:'w',title:'Spa',type:'wellness',currency:'THB',price:null,wellnessPricing:[{id:'60',durationInMinutes:60,amount_after_service_charge:1800}]}};expect(unitPrice(l)).toBeNull();l.wellnessPricingId='60';expect(unitPrice(l)).toBe(1800);expect(summarize([l]).groups[0].subtotals.THB).toBe(3600)});
 it('blocks unavailable products',()=>{const cart=summarize([{id:'x',productId:'gone',quantity:1,product:{}}]);expect(checkoutEligible(cart.groups[0])).toBe(false)})
});
