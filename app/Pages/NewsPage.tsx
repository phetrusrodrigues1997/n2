'use client';

import React from 'react';
import { Clock, Share, MessageCircle, Heart, Bookmark } from 'lucide-react';

interface NewsArticle {
  id: number;
  headline: string;
  summary: string;
  icon: string;
  category: string;
  timeAgo: string;
  source: string;
  likes: number;
  comments: number;
  shares: number;
}

interface NewsPageProps {
  onBack: () => void;
}

const NewsPage = ({ onBack }: NewsPageProps) => {
  const newsArticles: NewsArticle[] = [
    {
      id: 1,
      headline: "Bitcoin Surges Past $100K as Institutional Adoption Accelerates",
      summary: "Major banks and corporations continue their crypto integration strategies, with BlackRock's Bitcoin ETF seeing record inflows this week.",
      icon: "/BitCoinIcon.png",
      category: "Crypto",
      timeAgo: "2h",
      source: "Reuters",
      likes: 1247,
      comments: 89,
      shares: 156
    },
    {
      id: 2,
      headline: "Tesla Stock Rallies 15% After Record Q4 Delivery Numbers",
      summary: "Elon Musk's electric vehicle company exceeded analyst expectations with 500K deliveries, signaling strong demand despite economic headwinds.",
      icon: "/stocks.jpg",
      category: "Stocks",
      timeAgo: "4h",
      source: "Bloomberg",
      likes: 892,
      comments: 234,
      shares: 78
    },
    {
      id: 3,
      headline: "Verstappen Secures Pole Position for Championship Deciding Race",
      summary: "The Dutch driver set a new track record at Abu Dhabi Grand Prix qualifying, positioning himself perfectly for his fourth consecutive title.",
      icon: "/formula.jpg",
      category: "Formula 1",
      timeAgo: "6h",
      source: "BBC Sport",
      likes: 2156,
      comments: 456,
      shares: 289
    },
    {
      id: 4,
      headline: "Sabrina Carpenter's 'Espresso' Breaks Spotify Streaming Records",
      summary: "The pop sensation's latest hit becomes the most-streamed song in a single day, overtaking previous records held by Taylor Swift.",
      icon: "/SabrinaCarpIcon.png",
      category: "Music",
      timeAgo: "8h",
      source: "Rolling Stone",
      likes: 3421,
      comments: 678,
      shares: 445
    },
    {
      id: 5,
      headline: "X Platform Introduces Revolutionary AI Content Moderation",
      summary: "Elon Musk announces breakthrough technology that will reshape social media interactions and trending topic algorithms worldwide.",
      icon: "/xtwitter.jpg",
      category: "Technology",
      timeAgo: "12h",
      source: "TechCrunch",
      likes: 1876,
      comments: 892,
      shares: 234
    },
    {
      id: 6,
      headline: "Adele Announces Surprise Album and World Tour Dates",
      summary: "The Grammy-winning artist reveals her fifth studio album will drop next month, accompanied by a massive global tour starting in London.",
      icon: "/AdeleIcon.png",
      category: "Entertainment",
      timeAgo: "14h",
      source: "Entertainment Weekly",
      likes: 4567,
      comments: 1234,
      shares: 789
    }
  ];

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Back</span>
          </button>

          <h1 className="text-xl font-bold text-gray-900">Prediwin News</h1>

          <div className="w-16"></div> {/* Spacer for centering */}
        </div>
      </div>

      {/* News Feed */}
      <div className="w-full">
        {/* Mobile Layout - Single Column */}
        <div className="md:hidden">
          {newsArticles.map((article, index) => (
            <article
              key={article.id}
              className="border-b border-gray-100 px-4 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              {/* Article Header */}
              <div className="flex items-start gap-3 mb-3">
                <img
                  src={article.icon}
                  alt={article.category}
                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{article.source}</span>
                    <span className="text-gray-500">•</span>
                    <span className="text-sm text-gray-500">{article.timeAgo}</span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                      {article.category}
                    </span>
                  </div>
                </div>

                {/* More options */}
                <button className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
              </div>

              {/* Article Content */}
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-900 mb-3 leading-tight">
                  {article.headline}
                </h2>
                <p className="text-gray-700 text-base leading-relaxed">
                  {article.summary}
                </p>
              </div>

              {/* Engagement Stats */}
              <div className="flex items-center justify-between pt-3 ">
                <div className="flex items-center gap-6">
                  {/* Comments */}
                  <button className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors group">
                    <div className="p-2 rounded-full group-hover:bg-blue-50 transition-colors">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium">{formatNumber(article.comments)}</span>
                  </button>

                  {/* Shares */}
                  <button className="flex items-center gap-2 text-gray-500 hover:text-green-600 transition-colors group">
                    <div className="p-2 rounded-full group-hover:bg-green-50 transition-colors">
                      <Share className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium">{formatNumber(article.shares)}</span>
                  </button>

                  {/* Likes */}
                  <button className="flex items-center gap-2 text-gray-500 hover:text-[#D00048] transition-colors group">
                    <div className="p-2 rounded-full group-hover:bg-red-50 transition-colors">
                      <Heart className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium">{formatNumber(article.likes)}</span>
                  </button>
                </div>

                {/* Bookmark */}
                <button className="text-gray-500 hover:text-purple-600 transition-colors group">
                  <div className="p-2 rounded-full group-hover:bg-purple-50 transition-colors">
                    <Bookmark className="w-5 h-5" />
                  </div>
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* Desktop Layout - Grid */}
        <div className="hidden md:block">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Featured Article - Top Row */}
            <div className="mb-8">
              <article className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <div className="p-8">
                  <div className="flex items-start gap-6 mb-6">
                    <img
                      src={newsArticles[0].icon}
                      alt={newsArticles[0].category}
                      className="w-16 h-16 rounded-full object-cover border-3 border-gray-200"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-gray-900 text-lg">{newsArticles[0].source}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-600">{newsArticles[0].timeAgo}</span>
                        <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-semibold text-sm">
                          {newsArticles[0].category}
                        </span>
                        <span className="bg-red-100 text-[#D00048] px-3 py-1 rounded-full font-semibold text-sm">
                          BREAKING
                        </span>
                      </div>
                    </div>
                  </div>

                  <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
                    {newsArticles[0].headline}
                  </h1>
                  <p className="text-xl text-gray-700 leading-relaxed mb-6">
                    {newsArticles[0].summary}
                  </p>

                  {/* Engagement Stats */}
                  <div className="flex items-center gap-8 pt-4 ">
                    <button className="flex items-center gap-3 text-gray-500 hover:text-blue-600 transition-colors group">
                      <div className="p-3 rounded-full group-hover:bg-blue-50 transition-colors">
                        <MessageCircle className="w-6 h-6" />
                      </div>
                      <span className="font-semibold">{formatNumber(newsArticles[0].comments)}</span>
                    </button>

                    <button className="flex items-center gap-3 text-gray-500 hover:text-green-600 transition-colors group">
                      <div className="p-3 rounded-full group-hover:bg-green-50 transition-colors">
                        <Share className="w-6 h-6" />
                      </div>
                      <span className="font-semibold">{formatNumber(newsArticles[0].shares)}</span>
                    </button>

                    <button className="flex items-center gap-3 text-gray-500 hover:text-[#D00048] transition-colors group">
                      <div className="p-3 rounded-full group-hover:bg-red-50 transition-colors">
                        <Heart className="w-6 h-6" />
                      </div>
                      <span className="font-semibold">{formatNumber(newsArticles[0].likes)}</span>
                    </button>

                    <button className="flex items-center gap-3 text-gray-500 hover:text-purple-600 transition-colors group ml-auto">
                      <div className="p-3 rounded-full group-hover:bg-purple-50 transition-colors">
                        <Bookmark className="w-6 h-6" />
                      </div>
                    </button>
                  </div>
                </div>
              </article>
            </div>

            {/* Secondary Articles - Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {newsArticles.slice(1).map((article, index) => (
                <article
                  key={article.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer"
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <img
                        src={article.icon}
                        alt={article.category}
                        className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-gray-900">{article.source}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-sm text-gray-500">{article.timeAgo}</span>
                        </div>
                        <span className="inline-block bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium text-xs">
                          {article.category}
                        </span>
                      </div>
                    </div>

                    <h2 className="text-xl font-bold text-gray-900 mb-3 leading-tight line-clamp-2">
                      {article.headline}
                    </h2>
                    <p className="text-gray-700 leading-relaxed mb-4 line-clamp-3">
                      {article.summary}
                    </p>

                    {/* Engagement Stats */}
                    <div className="flex items-center justify-between pt-4 ">
                      <div className="flex items-center gap-4">
                        <button className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors group">
                          <div className="p-2 rounded-full group-hover:bg-blue-50 transition-colors">
                            <MessageCircle className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-medium">{formatNumber(article.comments)}</span>
                        </button>

                        <button className="flex items-center gap-2 text-gray-500 hover:text-green-600 transition-colors group">
                          <div className="p-2 rounded-full group-hover:bg-green-50 transition-colors">
                            <Share className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-medium">{formatNumber(article.shares)}</span>
                        </button>

                        <button className="flex items-center gap-2 text-gray-500 hover:text-[#D00048] transition-colors group">
                          <div className="p-2 rounded-full group-hover:bg-red-50 transition-colors">
                            <Heart className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-medium">{formatNumber(article.likes)}</span>
                        </button>
                      </div>

                      <button className="text-gray-500 hover:text-purple-600 transition-colors group">
                        <div className="p-2 rounded-full group-hover:bg-purple-50 transition-colors">
                          <Bookmark className="w-4 h-4" />
                        </div>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Load More */}
      <div className="text-center py-8">
        <button className="bg-purple-700 text-white px-6 py-3 rounded-lg hover:bg-purple-800 transition-colors font-medium">
          Load More Stories
        </button>
      </div>
    </div>
  );
};

export default NewsPage;