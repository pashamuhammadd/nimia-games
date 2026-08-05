import * as React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { OrderReceiptDocument, type OrderReceiptDocumentProps } from "./OrderReceiptDocument";

// Thin wrapper so app/api routes never import @react-pdf/renderer directly
// (same "consumers import the package root, not internals" convention as
// every @nimia/* package in this monorepo).
//
// The cast below is required, not just convenience: @react-pdf/renderer
// types `renderToBuffer` as accepting only a rendered <Document> element
// (typed to that component's own props), not a custom component that merely
// returns one. OrderReceiptDocument's own props (OrderReceiptDocumentProps)
// don't structurally match that, so TypeScript rejects the element as-is
// even though at runtime it's exactly what react-pdf expects (a component
// tree rooted in <Document>). Casting through `any` is the standard
// workaround for this mismatch — it doesn't change what's actually rendered.
export async function renderOrderReceiptPdf(props: OrderReceiptDocumentProps): Promise<Buffer> {
  const element = React.createElement(OrderReceiptDocument, props) as unknown as Parameters<typeof renderToBuffer>[0];
  return renderToBuffer(element);
}
