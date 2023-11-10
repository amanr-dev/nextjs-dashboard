'use server';
import { z } from "zod"; 
import { sql } from "@vercel/postgres"; 
// import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";


export type State = {
     errors?: {
       customerId?: string[];
       amount?: string[];
       status?: string[];
     };
     message?: string | null;
   };

const InvoiceSchema = z.object({
     id: z.string(),
     customerId: z.string({
          invalid_type_error: "Please select a customer."
     }),
     amount: z.coerce.number().gt(0, {
          message: 'Please enter a amount greater than $0.'
     }),
     status: z.enum(['pending', 'paid'], {
          invalid_type_error: "Please select an invoice status."
     }),
     date: z.string(),
   }); 

   

//    Create Invoice
   const CreateInvoice = InvoiceSchema.omit({ id: true, date: true });
   
   export async function createInvoice(prevState: State, formData: FormData) {
        const validateFields = CreateInvoice.safeParse({
          customerId: formData.get('customerId'),
          amount: formData.get('amount'),
          status: formData.get('status'),
     })

     if (!validateFields.success) {
          return {
          errors: validateFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.', 
          }
     }

     const {customerId, amount, status} = validateFields.data;
     const amountInCents = amount * 100;
     const date = new Date().toISOString().split('T')[0];
     
     try {
          await sql`
          INSERT INTO invoices (customer_id, amount, status, date) VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
          `;
     } catch (error) {
          return {
               message: "Database Error: Failed to create Invoice.",
          };
     }

     revalidatePath('/dashboard/invoices')
     redirect('/dashboard/invoices')
}

// Update Invoice
     const UpdateInvoice = InvoiceSchema.omit({date: true, id: true});

     export async function updateInvoice(id: string, formData: FormData){
     const {customerId, amount, status} = UpdateInvoice.parse({
     customerId: formData.get('customerId'),
     amount: formData.get('amount'),
     status: formData.get('status'),
});

const amountInCents = amount * 100;

try {
     await sql`
         UPDATE invoices
         SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
         WHERE id = ${id}
     `;
     
} catch (error) {
     return { message: 'Database Error: Failed to Update Invoice.' };
}

     revalidatePath('/dashboard/invoices');
     redirect('/dashboard/invoices');
}


// Delete Invoice
export async function deleteInvoice(id: string){
     // throw new Error('Failed to Delete Invoice');

     try {
          await sql`DELETE FROM invoices WHERE id = ${id}`;
          revalidatePath('/dashboard/invoices');
          return { message: 'Deleted Invoice.' };

     } catch (error) {
          return { message: 'Database Error: Failed to Update Invoice.' };

     }
}