import * as React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { OrderReceiptDocument, type OrderReceiptDocumentProps } from "./OrderReceiptDocument";

// Thin wrapper so app/api routes never import @react-pdf/renderer directly
// (same "consumers import the package root, not internals" convention as
// every @nimia/* package in this monorepo).
export async function renderOrderReceiptPdf(props: OrderReceiptDocumentProps): Promise<Buffer> {
  return renderToBuffer(React.createElement(OrderReceiptDocument, props));
}
