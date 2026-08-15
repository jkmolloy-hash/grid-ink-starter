import { Helmet } from "react-helmet-async";

const SITE = "https://www.gridandinkco.com";

export default function Seo({
  title,
  description,
  path,
  noindex,
  children,
}: {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  children?: React.ReactNode;
}) {
  const url = `${SITE}${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      {noindex ? <meta name="robots" content="noindex" /> : null}
      {children}
    </Helmet>
  );
}
