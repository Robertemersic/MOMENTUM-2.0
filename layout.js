export const metadata = {
  title: "Momentum",
  description: "Your intelligent productivity planner",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
