export {ACCOUNT_SENDER,ACCOUNT_ORIGIN,encryptMailPassword,emailAvailable} from '../../lib/account-mail.mjs';
export const deliveries=[];
export let failDelivery=false;
export function setMailFailure(value){failDelivery=value;}
export async function sendAccountReset(db,email,token){if(failDelivery)throw Error('Fixture SMTP unavailable');deliveries.push({email,token});}
export function gmailTransport(){return {verify:async()=>true,sendMail:async message=>{deliveries.push({test:message.to});return {accepted:[message.to]};},close(){}};}
