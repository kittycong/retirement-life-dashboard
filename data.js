window.retirementDefaults = {
  person: {
    label: "내 연금 정보",
    birthYear: 1988,
    currentAge: 37,
    currentYear: 2026,
    retirementAge: 60,
    publicPensionAge: 65,
    planUntilAge: 90
  },
  assumptions: {
    monthlyLivingCost: 1700000,
    annualRealReturn: 2,
    inflationRate: 0,
    monthlyAdditionalSaving: 580000,
    emergencyFundMonths: 6
  },
  pensions: {
    nationalPensionMonthly: 1041780,
    nationalPensionStartYear: 2053,
    dcIrpBalance: 21645496,
    dbBalance: 0,
    personalPensionBalance: 0
  },
  accounts: [
    {
      institution: "기업은행",
      type: "DC",
      product: "삼성KODEX200미국채혼합증권상장지수투자신탁(채권혼합)",
      openedAt: "2025-05-14",
      pensionStartDate: "2049-11-09",
      balance: 3055164,
      asOf: "2026-04-30"
    },
    {
      institution: "우리은행",
      type: "개인 IRP형",
      product: "한국투자웰링턴글로벌퀄리티UH(주식)(C-Re) 외 15",
      openedAt: "2024-05-24",
      pensionStartDate: "2048-12-01",
      balance: 18590332,
      asOf: "2026-04-30"
    }
  ],
  scenarios: [
    { id: "lean", name: "검소", monthlyLivingCost: 1320000 },
    { id: "base", name: "기준", monthlyLivingCost: 1700000 },
    { id: "comfortable", name: "여유", monthlyLivingCost: 1900000 }
  ]
};
