import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, Search, BookOpen, Calendar } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { format } from "date-fns";

export default function Guides() {
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    document.title = "Guides & Tutorials - QuizMintAI | Learn How to Create Perfect Quizzes";
  }, []);

  const { data: guides = [], isLoading } = useQuery({
    queryKey: ["guides"],
    queryFn: async () => {
      const allGuides = await base44.entities.BlogPost.filter(
        { published: true, category: "guide" },
        "-published_date"
      );
      return allGuides;
    },
  });

  const filteredGuides = guides.filter(
    (guide) =>
      guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 mb-6">
            <BookOpen className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Guides & Tutorials
            </span>
          </h1>
          <p className="text-lg text-zinc-600 max-w-2xl mx-auto mb-8">
            Step-by-step guides to help you master quiz creation with AI
          </p>

          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <Input
              placeholder="Search guides..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 border-2"
            />
          </div>
        </motion.div>

        {isLoading ? (
          <div className="text-center py-20">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent" />
          </div>
        ) : filteredGuides.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            {searchQuery ? "No guides found matching your search." : "No guides available yet."}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {filteredGuides.map((guide, i) => (
              <motion.div
                key={guide.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Link to={createPageUrl(`BlogPost?slug=${guide.slug}`)}>
                  <Card className="h-full hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer group">
                    {guide.featured_image && (
                      <div className="h-56 overflow-hidden rounded-t-xl">
                        <img
                          src={guide.featured_image}
                          alt={guide.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <CardHeader>
                      {guide.published_date && (
                        <div className="flex items-center gap-2 mb-3 text-sm text-zinc-500">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(guide.published_date), "MMM d, yyyy")}
                        </div>
                      )}
                      <CardTitle className="text-2xl group-hover:text-purple-600 transition-colors">
                        {guide.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-zinc-600 mb-4">{guide.excerpt}</p>
                      <div className="flex items-center text-purple-600 font-medium">
                        Read guide
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