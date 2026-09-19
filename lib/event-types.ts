export type EventFormat = "offline" | "online" | "hybrid";
export type EventVisibility = "public" | "unlisted" | "private";

export type EventAgendaItem = {
  time: string;
  title: string;
  description: string;
};

export type EventSpeaker = {
  name: string;
  title: string;
  profileUrl: string;
};

export type EventFaq = {
  question: string;
  answer: string;
};

export type EventSocialLink = {
  label: string;
  url: string;
};

export type RegistrationFieldType =
  | "text"
  | "email"
  | "phone"
  | "number"
  | "date"
  | "url"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox";

export type RegistrationFieldDefinition = {
  id: string;
  label: string;
  description: string;
  placeholder: string;
  type: RegistrationFieldType;
  required: boolean;
  options: string[];
  conditionalFieldId: string;
  conditionalValue: string;
};

export type EventTicket = {
  id: string;
  name: string;
  description: string;
  pricePaise: number;
  quantity: number;
  registeredCount: number;
  salesStart: string | null;
  salesEnd: string | null;
  minPerOrder: number;
  maxPerOrder: number;
  visibility: "public" | "hidden";
  paymentUpiId: string | null;
  paymentPayeeName: string | null;
  paymentQrUrl: string | null;
};
