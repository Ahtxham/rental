import type { AdminDocument } from "@/models/admin-model";
import type { AgencySnapshot } from "@/models/agency-model";
import type { LenderDocument } from "@/models/lender-model";

declare global {
  namespace Express {
    interface Request {
      user?: AdminDocument | LenderDocument;
      accountType?: "admin" | "lender";
      /**
       * When the presented token runs out, in seconds since epoch. Read by
       * `/api/auth/me` so a session close to expiry can be handed a fresh
       * token instead of dying under somebody mid-booking.
       */
      tokenExp?: number;
      /**
       * The business id every query must be scoped by. Undefined means the
       * request never resolved one, and `requireAgencyScope` blocks it before
       * a controller can run an unscoped query. Mongoose drops undefined
       * filter keys, so an unscoped `find` reads everything.
       */
      ownerId?: string;
      /**
       * The resolved business, source of the commission rate, the currency
       * and the self-drive switch. A cached plain object, not a live document:
       * anything that writes must re-load it with `Agency.findById` and then
       * call `invalidateAgency`.
       */
      agency?: AgencySnapshot;
    }
  }
}

export {};
