"use client"; // ⚠️ Important for client-side fetching

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight, Calendar } from "lucide-react";

export default function BlogPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      const res = await fetch("/api/blog");
      const data = await res.json();
      setPosts(data);
      setLoading(false);
    }

    fetchPosts();
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-cyan-50">
      <div className="max-w-7xl mx-auto px-6 py-20">
        {/* Hero */}
        <h1 className="text-5xl font-bold mb-12 text-center">
          <span className="bg-linear-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            QuizMintAI Blog
          </span>
        </h1>

        {loading ? (
          <div className="text-center py-20">Loading...</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`}>
                <div className="border rounded-xl overflow-hidden hover:shadow-xl transition-all p-6 cursor-pointer">
                  <div className="flex gap-4 text-sm text-zinc-500 mb-3">
                    {post.createdAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(post.createdAt), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl font-semibold mb-2">{post.title}</h2>

                  <p className="text-zinc-600 line-clamp-3 mb-4">{post.excerpt}</p>

                  <div className="flex items-center text-blue-600 font-medium">
                    Read more
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
