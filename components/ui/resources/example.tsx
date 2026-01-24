import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowRight, Search, Lightbulb } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function Examples() {
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    document.title = "Quiz Examples - QuizMintAI | Real Quiz Templates & Samples";
  }, []);

  const { data: examples = [], isLoading } = useQuery({
    queryKey: ["examples"],
    queryFn: async () => {
      const allExamples = await base44.entities.BlogPost.filter(
        { published: true, category: "example" },
        "-published_date"
      );
      return allExamples;
    },
  });

  const filteredExamples = examples.filter(
    (example) =>
      example.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      example.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50">
      <div className="max-w-7xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-yellow-500 mb-6">
            <Lightbulb className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent">
              Quiz Examples
            </span>
          </h1>
          <p className="text-lg text-zinc-600 max-w-2xl mx-auto mb-8">
            Get inspired by real quiz examples and templates from various subjects
          </p>

          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <Input
              placeholder="Search examples..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 border-2"
            />
          </div>
        </motion.div>

        {isLoading ? (
          <div className="text-center py-20">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent" />
          </div>
        ) : filteredExamples.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            {searchQuery ? "No examples found matching your search." : "No examples available yet."}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {filteredExamples.map((example, i) => (
              <motion.div
                key={example.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <Link to={createPageUrl(`BlogPost?slug=${example.slug}`)}>
                  <Card className="h-full hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer group">
                    {example.featured_image && (
                      <div className="h-44 overflow-hidden rounded-t-xl">
                        <img
                          src={example.featured_image}
                          alt={example.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <Badge className="mb-3 w-fit bg-orange-100 text-orange-700">
                        Example
                      </Badge>
                      <CardTitle className="group-hover:text-orange-600 transition-colors">
                        {example.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-zinc-600 mb-4 text-sm line-clamp-2">
                        {example.excerpt}
                      </p>
                      <div className="flex items-center text-orange-600 font-medium text-sm">
                        View example
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}