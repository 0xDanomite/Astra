import { DynamicStructuredTool } from "@langchain/core/tools";
import { coingeckoService } from '@/lib/services/coingecko';
import { z } from 'zod';

export const listCategoriesTools = () => {
  return new DynamicStructuredTool({
    name: "list_categories",
    description: "Lists available token categories for strategy creation",
    schema: z.object({
      detailed: z.boolean().optional()
    }),
    func: async ({ detailed }) => {
      const categories = await coingeckoService.getCategories();
      if (detailed) {
        return JSON.stringify(categories, null, 2);
      }
      return categories.join(', ');
    }
  });
};
