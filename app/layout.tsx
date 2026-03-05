export const metadata = {
  title: 'Prompt Builder',
  description: 'Modular Prompt Builder - Create your template for infinite image variations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
