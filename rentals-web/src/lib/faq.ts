/**
 * The questions customers actually ask, in one place.
 *
 * Shared because `/how-it-works` renders them AND emits them as `FAQPage`
 * structured data. Two copies would drift, and structured data whose answers
 * differ from the visible page is how a site earns a manual action rather than
 * a rich result.
 */
export const FAQ = [
  {
    q: "How is a day counted?",
    a: "Twenty-four hours from the time you take the car, rounded up, out at 10am Monday and back at 2pm Tuesday is two days. There is an hour of grace on the return, so being a few minutes late in traffic does not cost you a whole day.",
  },
  {
    q: "What is the security deposit for?",
    a: "Damage, a challan that arrives after you have gone, or fuel the car comes back short. It is held, never spent, and returned in full when there is nothing to take out of it.",
  },
  {
    q: "Who pays for fuel?",
    a: "You do. The car is handed over with a full tank and should come back full. If it does not, we fill it and take the cost out of the deposit at the pump price.",
  },
  {
    q: "What happens if I go over the kilometres?",
    a: "You are charged the per-kilometre rate that was on your agreement from the start. Nothing is invented at the end, if you can see the allowance and the rate before you sign, you can work out the worst case yourself.",
  },
  {
    q: "Can I take the car out of Lahore?",
    a: "Usually yes, and it is worth telling us when you book so the kilometre allowance is set for the trip rather than for city driving. Some cars are city-only; we will say so.",
  },
  {
    q: "Do you deliver the car?",
    a: "In most of Lahore, yes, for a delivery charge quoted with the rest. Airport pickups are common and we would rather know the flight number than the time.",
  },
  {
    q: "What if I need to cancel?",
    a: "Tell us as early as you can and we will move the dates or refund the advance where we can still fill the car. The full position is in the terms.",
  },
] as const;
