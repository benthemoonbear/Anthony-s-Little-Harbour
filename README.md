# Anthony's Little Harbour Series

Redesigned website for [anthonyslittleharbourseries.co.uk](https://www.anthonyslittleharbourseries.co.uk/): children's seaside picture books by Anthony Goode, illustrated by Tom Harding.

The design follows the style of *Oscar and the Little Harbour*: painted sea and night-sky artwork from the book, its white rounded text boxes, and the characters cut out of the illustrations.

## Structure

- `index.html` – the whole site (single page, no build step). Open it in a browser to view.
- `img/` – web-ready artwork (WebP), the author photo and the downloadable colouring page.
- `fonts/` – Short Stack and Nunito, self-hosted (both SIL Open Font License).
- `js/shop.js` – the order system (basket, checkout, trade enquiries). Prices, postage and the order email are set at the top of this file.
- `characters/` – full-size transparent PNG cut-outs: Oscar, Noah, Sophie, Tom, Elsie, Pete & Andy, the seagull and clouds.

## Ordering

Customers add books to a basket, choose UK post or free collection in Matlock, and place an order with their name, email and address. No payment is taken on the site: the order is emailed to Anthony, the customer gets an automatic confirmation with an order reference, and Anthony replies with bank details for payment by bank transfer (BACS). Shops and schools use the separate trade enquiry form.

Forms are sent with [FormSubmit](https://formsubmit.co) (free, no server needed).

**Before going live:**
1. The very first order or enquiry triggers an activation email from FormSubmit to `contactanthony@anthonyslittleharbourseries.co.uk`. Anthony must click the link in it, or no orders will arrive. Send a test order yourself to trigger it.
2. Check the postage prices in `js/shop.js` (currently placeholder figures: £3.50 for the first book, £1.00 for each extra).
3. Optional: once activated, FormSubmit gives a random alias for the email address; swap it into `js/shop.js` so Anthony's address isn't visible in the page source.

If FormSubmit can't be reached, the customer is offered a ready-written email to send instead, so no order is lost.

## To do

- Check the short character description for Tom with Anthony.

Illustrations © Tom Harding. Stories © Anthony Goode.
