import { InvestmentDetailPageContent } from "@/components/marketplace/InvestmentDetailPageContent";

export function generateStaticParams() {
  return [{ investmentId: "vault-usdc" }];
}

export default function MarketplaceInvestmentPage({
  params,
}: {
  params: { investmentId: string };
}) {
  if (params.investmentId !== "vault-usdc") {
    return <InvestmentDetailPageContent investmentId={params.investmentId} />;
  }

  return <InvestmentDetailPageContent investmentId={params.investmentId} />;
}
