export interface AuditData {
  audit_id: string;
  prospect_name: string;
  prospect_city: string;
  prospect_state: string;
  niche_label: string;
  prospect_rank: string;
  prospect_reviews: string;
  prospect_rating: string;
  comp1_name: string;
  comp1_reviews: string;
  comp1_rating: string;
  comp2_name: string;
  comp2_reviews: string;
  comp2_rating: string;
  comp3_name: string;
  comp3_reviews: string;
  comp3_rating: string;
  review_gap: string;
  missed_calls?: string;
  avg_ticket: string;
  lost_monthly?: string;
  lost_annual?: string;
  top3_estimated_calls: string;
  prospect_estimated_calls: string;
  opportunity_gap_calls: string;
  opportunity_monthly: string;
  opportunity_annual: string;
  monthly_price: string;
  setup_fee: string;
  market_tier: string;
  track?: string;
}

export const sampleData: AuditData = {
  audit_id: "test-001",
  prospect_name: "Hail Dent Professional",
  prospect_city: "Dallas",
  prospect_state: "TX",
  niche_label: "auto hail repair shop",
  prospect_rank: "#8",
  prospect_reviews: "34",
  prospect_rating: "4.7",
  comp1_name: "Dallas Dent Repair",
  comp1_reviews: "187",
  comp1_rating: "4.8",
  comp2_name: "Hail Heroes PDR",
  comp2_reviews: "142",
  comp2_rating: "4.7",
  comp3_name: "Texas Dent Pro",
  comp3_reviews: "98",
  comp3_rating: "4.5",
  review_gap: "153",
  missed_calls: "35",
  avg_ticket: "450",
  lost_monthly: "15,750",
  lost_annual: "189,000",
  top3_estimated_calls: "85",
  prospect_estimated_calls: "25",
  opportunity_gap_calls: "60",
  opportunity_monthly: "27,000",
  opportunity_annual: "324,000",
  monthly_price: "500",
  setup_fee: "1,500",
  market_tier: "A",
};
