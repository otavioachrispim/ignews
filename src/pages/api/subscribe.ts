import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from 'next-auth/client'
import { fauna } from "../../services/fauna";
import { query as q} from 'faunadb';
import { stripe } from "../../services/stripe";

type User = {
  ref: {
    id: string;
  }
  data: {
    stripe_costumer_id: string;
  }
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST'){    
    /*criação do usuario(customer) no painel do stripe, pois são dados(Fauna e stripe) diferentes.*/
    const session = await getSession({req})

    const user = await fauna.query<User>(
      q.Get(
        q.Match(
          q.Index('user_by_email'),
          q.Casefold(session.user.email)
        )
      )
    )

    let customerId = user.data.stripe_costumer_id

    if (!customerId){
      const stripeCostumer = await stripe.customers.create({
        email: session.user.email,
        // metadata
      })

      await fauna.query(
        q.Update(
          q.Ref(q.Collection('users'), user.ref.id),
          {
            data: {
              stripe_costumer_id: stripeCostumer.id,
            }
          }
        )
      )  

      customerId = stripeCostumer.id
    }  

    const stripeCheckoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      billing_address_collection: 'required',
      line_items: [
        {price: 'price_1J7lHjI2vnQWNjpvyBjoezaw', quantity: 1}
      ],
      mode: 'subscription',
      allow_promotion_codes: true,
      success_url: process.env.STRIPE_SUCESS_URL,
      cancel_url: process.env.STRIPE_CANCEL_URL
    })   

    return res.status(200).json({ sessionId: stripeCheckoutSession.id })
  } else {
    res.setHeader('Allow', 'POST')
    res.status(405).end('Method not allowed')
  }
}


// import { NextApiRequest, NextApiResponse } from "next";
// import { Readable } from 'stream';
// import Stripe from "stripe";
// import { stripe } from "../../services/stripe";
// import { saveSubscription } from "./_lib/manageSubscription";

// async function buffer(readable: Readable){
//   const chunks = [];

//   for await (const chunk of readable){
//     chunks.push(
//       typeof chunk === "string" ? Buffer.from(chunk) : chunk
//     );
//   }

//   return Buffer.concat(chunks);
// }

// export const config = {
//   api: { 
//     bodyParser: false
//   }
// }

// const relevantEvents = new Set([
//   'checkout.session.completed',
//   'customer.subscription_created',
//   'customer.subscription_updated',
//   'customer.subscription_deleted',
// ])

// export default async (req: NextApiRequest, res: NextApiResponse) => {
//   if (req.method === 'POST'){  
//   const buf = await buffer(req)
//   const secret = req.headers['stripe-signature']

//   let event: Stripe.Event;

//   try{
//     event = stripe.webhooks.constructEvent(buf, secret, process.env.STRIPE_WEBHOOK_SECRET);
//   } catch (err) {
//     return res.status(400).send(`Webhook error: ${err.message}`);
//   }

//   const { type } = event;

//   if (relevantEvents.has(type)){
//     try{   
//     switch(type){
//       case 'checkout.subscription.created':
//       case 'checkout.subscription.updated':
//       case 'checkout.subscription.deleted':        
//         const subscription = event.data.object as Stripe.Subscription;

//         await saveSubscription(
//           subscription.id,
//           subscription.customer.toString(),
//           type === 'customer.subscription.created',
//         );

//         break;            
//       case 'checkout.session.complete':
//         const checkoutSession = event.data.object as Stripe.Checkout.Session

//         await saveSubscription(
//           checkoutSession.subscription.toString(),
//           checkoutSession.customer.toString(),
//           true
//         )

//         break;
//         default:
//           throw new Error('Unhandled event.')          
//     }
//   } catch (err) {
//     return res.json({ error: 'Webhook handler failed.'})
//   }
// }
  

//   res.json({received: true})
//   } else {
//   res.setHeader('Allow', 'POST')
//   res.status(405).end('Method not allowed')
//   }
// }