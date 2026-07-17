import { Leaf, MilkOff, WheatOff } from "lucide-react";
import { getDietaryTags, type DietaryTag } from "@/lib/food-tabs";

export type DietaryTagLabels = Record<DietaryTag, string>;

const badgeByTag: Record<DietaryTag, { icon: React.ElementType; className: string }> = {
  GLUTEN_FREE: { icon: WheatOff, className: "border-amber-200 bg-amber-50 text-amber-600" },
  LACTOSE_FREE: { icon: MilkOff, className: "border-sky-200 bg-sky-50 text-sky-600" },
  VEGETARIAN: { icon: Leaf, className: "border-emerald-200 bg-emerald-50 text-emerald-600" },
};

export default function DietaryTagBadges({
  rawTags,
  labels,
  className,
}: {
  rawTags?: string | null;
  labels: DietaryTagLabels;
  className?: string;
}) {
  const tags = getDietaryTags(rawTags);
  if (tags.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className ?? ""}`}>
      {tags.map((tag) => {
        const { icon: Icon, className: badgeClassName } = badgeByTag[tag];
        return (
          <span
            key={tag}
            title={labels[tag]}
            aria-label={labels[tag]}
            className={`flex h-7 w-7 items-center justify-center rounded-full border ${badgeClassName}`}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        );
      })}
    </div>
  );
}
