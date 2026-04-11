import { notFound } from "next/navigation";
import { InvestmentDetailPageContent } from "@/components/marketplace/InvestmentDetailPageContent";
import {
  getMockInvestmentById,
  MOCK_INVESTMENTS,
} from "@/components/marketplace/mockInvestments";

export function generateStaticParams() {
  return MOCK_INVESTMENTS.map((investment) => ({
    investmentId: investment.id,
  }));
}

export default function MarketplaceInvestmentPage({
  params,
}: {
  params: { investmentId: string };
}) {
  const investment = getMockInvestmentById(params.investmentId);

  if (!investment) {
    notFound();
  }

  return <InvestmentDetailPageContent investment={investment} />;
}
