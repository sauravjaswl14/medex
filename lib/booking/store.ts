import source from '@/data/task3-booking.json';
import {addDays,bookingTimes,dateAt,dayReason,groupStarts,makeSlots,slotKey,zoneFor,type Provider,type Reservation} from './engine';
export class BookingError extends Error{constructor(public status:number,message:string){super(message)}}
const providers=source.providers as Provider[];
const started=new Date();
const closures=source.closures.map(c=>({...c,date:addDays(dateAt(started,zoneFor(providers.find(p=>p.id===c.providerId)!)),c.dayOffset)}));
const occupied=new Set(source.bookedSlots.map(s=>slotKey(s.providerId,s.specialistId,addDays(dateAt(started,zoneFor(providers.find(p=>p.id===s.providerId)!)),s.dayOffset),s.startTime)));
const original=source.existingBooking;
const initialProvider=providers.find(p=>p.id===original.providerId)!;
const bookings=new Map<string,Reservation>([[original.bookingId,{...original,date:addDays(dateAt(started,zoneFor(initialProvider)),original.dayOffset)}]]);
const initial=bookings.get(original.bookingId)!;
for(const t of bookingTimes(initialProvider,initialProvider.specialists.find(s=>s.id===initial.specialistId)!,initial.startTime,initial.numberOfPeople))occupied.add(slotKey(initial.providerId,initial.specialistId,initial.date,t));
export function listProviders(){return providers.map(p=>({id:p.id,name:p.name,country:p.country,timezone:zoneFor(p)}))}
export function getProvider(id:number){const p=providers.find(p=>p.id===id);if(!p)throw new BookingError(404,'Provider not found');return {...p,resolvedTimezone:zoneFor(p)}}
export function getBooking(id:string){const b=bookings.get(id);if(!b)throw new BookingError(404,'Booking not found');return b}
export function availability(id:number,date:string,specialistId:string,now=new Date()){
 const p=getProvider(id);const specialist=p.specialists.find(s=>s.id===specialistId);if(!specialist)throw new BookingError(400,'Choose a valid specialist');
 const reason=dayReason(p,date,closures,now);const slots=makeSlots(p,specialist,date,closures,occupied,now);return {date,reason,slots,providerTimezone:p.resolvedTimezone};
}
export function calendar(id:number,specialistId:string,count:number,now=new Date()){
 const p=getProvider(id);const today=dateAt(now,p.resolvedTimezone);return Array.from({length:90},(_,i)=>{const date=addDays(today,i);const result=availability(id,date,specialistId,now);const available=groupStarts(result.slots,count).length;return {date,available,reason:result.reason??(available===0?'No consecutive free appointments':null)}})
}
function validate(input:{providerId:number;specialistId:string;date:string;startTime:string;numberOfPeople:number},ignoreId?:string){
 const p=getProvider(input.providerId);const specialist=p.specialists.find(s=>s.id===input.specialistId);if(!specialist)throw new BookingError(400,'Invalid specialist');if(!Number.isInteger(input.numberOfPeople)||input.numberOfPeople<1||input.numberOfPeople>4)throw new BookingError(400,'Group size must be 1–4');
 const slots=makeSlots(p,specialist,input.date,closures,occupied,new Date());const times=bookingTimes(p,specialist,input.startTime,input.numberOfPeople);
 const valid=times.every(t=>slots.some(s=>s.startTime===t&&(!s.isBooked||Boolean(ignoreId&&bookings.get(ignoreId)?.date===input.date&&bookings.get(ignoreId)?.startTime===t))));
 if(!valid)throw new BookingError(409,'This time is no longer available. Choose another appointment.');return times;
}
export function createBooking(input:{providerId:number;specialistId:string;date:string;startTime:string;numberOfPeople:number}){const times=validate(input);const bookingId=`BK-${crypto.randomUUID().slice(0,8)}`;const b={bookingId,...input};for(const t of times)occupied.add(slotKey(input.providerId,input.specialistId,input.date,t));bookings.set(bookingId,b);return {bookingId}}
export function reschedule(id:string,input:{date:string;startTime:string}){const previous=getBooking(id);const next={...previous,...input};const p=getProvider(previous.providerId);const specialist=p.specialists.find(s=>s.id===previous.specialistId)!;
 // Temporarily release the original reservation, then validate and atomically replace.
 const oldTimes=bookingTimes(p,specialist,previous.startTime,previous.numberOfPeople);for(const t of oldTimes)occupied.delete(slotKey(previous.providerId,previous.specialistId,previous.date,t));
 try{const times=validate(next);for(const t of times)occupied.add(slotKey(next.providerId,next.specialistId,next.date,t));bookings.set(id,next);return {bookingId:id,status:'rescheduled'}}catch(e){for(const t of oldTimes)occupied.add(slotKey(previous.providerId,previous.specialistId,previous.date,t));throw e}
}
export function originalBookingId(){return original.bookingId}
