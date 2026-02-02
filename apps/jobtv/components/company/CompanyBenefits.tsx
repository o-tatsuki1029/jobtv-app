import type { CompanyData } from "./types";

interface CompanyBenefitsProps {
  company: CompanyData;
}

export default function CompanyBenefits({ company }: CompanyBenefitsProps) {
  if (!company.benefits || company.benefits.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg md:text-xl font-bold mb-4 md:mb-6 flex items-center gap-2">
        <span className="w-1.5 h-5 md:h-6 bg-red-600 rounded-full" />
        福利厚生・制度
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        {company.benefits.map((benefit, index) => (
          <div key={index} className="bg-gray-800/50 hover:bg-gray-800/60 rounded-lg transition-all p-3 md:p-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 md:w-6 md:h-6 bg-red-600/20 text-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm md:text-base text-gray-200 font-medium">{benefit}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
