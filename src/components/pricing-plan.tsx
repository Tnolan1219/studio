
import { cn } from "@/lib/utils"
import { Check } from 'lucide-react';
import { Button } from "@/components/ui/button";

type PricingPlanProps = {
    plan: {
        name: string;
        price: number;
        features: string[];
    };
    isCurrent: boolean;
    onUpgrade: (planName: string) => void;
}

export const PricingPlan = ({ plan, isCurrent, onUpgrade }: PricingPlanProps) => {
    return (
        <div className={cn(
            "relative flex flex-col p-8 rounded-2xl border-2 shadow-lg",
            isCurrent ? "border-cyan-400 bg-cyan-400/10" : "border-gray-700 bg-gray-800/20"
        )}>
            {isCurrent && (
                <div className="absolute top-0 right-8 -translate-y-1/2 bg-cyan-400 text-black px-4 py-1 rounded-full text-sm font-bold">
                    Current Plan
                </div>
            )}
            
            <h3 className="text-3xl font-bold text-white mb-4">{plan.name}</h3>
            
            <div className="flex items-baseline text-white mb-6">
                <span className="text-5xl font-extrabold tracking-tight">${plan.price}</span>
                <span className="ml-2 text-xl font-semibold text-gray-400">/month</span>
            </div>

            <ul className="space-y-4 text-gray-300 flex-grow">
                {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center">
                        <Check className="h-6 w-6 text-cyan-400 mr-3" />
                        <span>{feature}</span>
                    </li>
                ))}
            </ul>
            
            <Button 
                className={cn(
                    "w-full mt-8 py-6 text-lg font-bold transition-transform duration-300",
                    isCurrent ? "bg-gray-600 cursor-not-allowed" : "bg-cyan-400 text-black hover:bg-cyan-300 hover:scale-105 shadow-lg shadow-cyan-500/50"
                )}
                onClick={() => !isCurrent && onUpgrade(plan.name)}
                disabled={isCurrent}
            >
                {isCurrent ? "Your Plan" : "Upgrade"}
            </Button>
        </div>
    )
}
