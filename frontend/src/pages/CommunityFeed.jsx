import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Heart,
  Search,
  SlidersHorizontal,
  Users,
  ChevronRight,
  TrendingUp,
  MessageSquare,
  Share2,
  Bookmark,
  MoreHorizontal,
  Plus,
} from 'lucide-react';
import { communityData } from '../communityData';

export default function CommunityFeed() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPosts = communityData.posts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.contentPreview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0b0c14] text-white selection:bg-blue-500/30">
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0b0c14]/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex justify-between items-center">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-[#0b0c14] rounded-sm rotate-45" />
          </div>
          <span className="text-xl font-black tracking-tighter uppercase">Traveloop</span>
        </Link>
        <div className="flex items-center gap-6">
           <Link to="/dashboard" className="text-xs font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">My Trips</Link>
           <Link to="/community" className="text-xs font-black uppercase tracking-widest text-blue-500">Community</Link>
           <button onClick={() => navigate('/profile')} className="w-8 h-8 rounded-full bg-white/10 overflow-hidden border border-white/10">
             <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Traveloop" alt="User" />
           </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-32 pb-24">
        
        {/* Search & Hero Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none">
              Community <span className="text-blue-500">Hub</span>
            </h1>
            <p className="text-slate-500 max-w-md font-medium">
              Join the conversation and discover the most epic journeys from our global explorers.
            </p>
          </div>
          
          <div className="w-full md:w-96 flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={18} />
              <input 
                type="text" 
                placeholder="Search stories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
              />
            </div>
            <button className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-white/40 hover:text-white">
              <SlidersHorizontal size={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Main Feed Column */}
          <div className="flex-1 space-y-10">
            {filteredPosts.length > 0 ? (
              filteredPosts.map((post) => (
                <article 
                  key={post.id}
                  className="bg-[#161827] rounded-[2.5rem] border border-white/5 overflow-hidden hover:border-white/10 transition-all shadow-2xl group"
                >
                  {/* Post Header */}
                  <div className="p-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 overflow-hidden border border-white/10 p-0.5">
                        <img src={post.avatarUrl} alt={post.authorName} className="w-full h-full object-cover rounded-[0.9rem]" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm uppercase tracking-tight">{post.authorName}</h4>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/20">{post.timestamp}</p>
                      </div>
                    </div>
                    <button className="p-2 text-white/20 hover:text-white transition-colors">
                      <MoreHorizontal size={20} />
                    </button>
                  </div>

                  {/* Post Image */}
                  {post.image && (
                    <div className="px-8">
                      <div className="aspect-[16/9] rounded-3xl overflow-hidden relative">
                        <img 
                          src={post.image} 
                          alt={post.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      </div>
                    </div>
                  )}

                  {/* Post Content */}
                  <div className="p-8 space-y-4">
                    <h2 className="text-2xl font-black uppercase tracking-tight group-hover:text-blue-400 transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-slate-400 leading-relaxed font-medium">
                      {post.contentPreview}
                    </p>

                    <div className="pt-6 flex items-center justify-between border-t border-white/5">
                      <div className="flex items-center gap-6">
                        <button className="flex items-center gap-2 group/btn">
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover/btn:bg-rose-500/10 group-hover/btn:text-rose-500 transition-all">
                            <Heart size={18} />
                          </div>
                          <span className="text-xs font-black text-white/40 group-hover/btn:text-white transition-colors">{post.likesCount}</span>
                        </button>
                        <button className="flex items-center gap-2 group/btn">
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover/btn:bg-blue-500/10 group-hover/btn:text-blue-500 transition-all">
                            <MessageSquare size={18} />
                          </div>
                          <span className="text-xs font-black text-white/40 group-hover/btn:text-white transition-colors">24</span>
                        </button>
                        <button className="flex items-center gap-2 group/btn">
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover/btn:bg-emerald-500/10 group-hover/btn:text-emerald-500 transition-all">
                            <Share2 size={18} />
                          </div>
                        </button>
                      </div>
                      <button className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all text-white/40 hover:text-white">
                        <Bookmark size={18} />
                      </button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="py-20 text-center bg-white/[0.02] border-2 border-dashed border-white/5 rounded-[3rem]">
                <Search size={48} className="mx-auto text-white/5 mb-6" />
                <h3 className="text-xl font-black uppercase tracking-widest text-white/20">No matching stories found</h3>
                <p className="text-slate-600 mt-2">Try adjusting your search terms.</p>
              </div>
            )}
          </div>


          {/* Sidebar */}
          <aside className="w-full lg:w-96 space-y-12">
            
            {/* Recommended Groups */}
            <section className="bg-[#161827] rounded-[2.5rem] border border-white/5 p-8 space-y-8 shadow-2xl">
              <header className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users size={18} className="text-blue-500" />
                  <h3 className="text-lg font-black uppercase tracking-tight">Active Groups</h3>
                </div>
                <ChevronRight size={18} className="text-white/20" />
              </header>

              <div className="space-y-6">
                {communityData.activeGroups.map((group) => (
                  <div key={group.id} className="flex items-center gap-4 group cursor-pointer">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0">
                      <img src={group.coverImage} alt={group.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-sm uppercase tracking-tight truncate group-hover:text-blue-400 transition-colors">{group.name}</h4>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/20">{group.memberCount} members</p>
                    </div>
                    <button className="p-2 bg-white/5 rounded-xl text-white/20 hover:text-white hover:bg-white/10 transition-all">
                      <Plus size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <button className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                Explore All Groups
              </button>
            </section>

            {/* Trending Discussions */}
            <section className="bg-gradient-to-br from-blue-600/10 to-indigo-600/10 rounded-[2.5rem] border border-blue-500/10 p-8 space-y-8 shadow-2xl">
              <header className="flex items-center gap-3">
                <TrendingUp size={18} className="text-blue-400" />
                <h3 className="text-lg font-black uppercase tracking-tight text-blue-400">Trending Now</h3>
              </header>

              <div className="space-y-6">
                {communityData.trendingDiscussions.map((discussion) => (
                  <div key={discussion.id} className="space-y-2 group cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[8px] font-black uppercase tracking-widest">
                        {discussion.category}
                      </span>
                      <span className="text-[8px] font-black uppercase tracking-widest text-white/20">{discussion.replyCount} replies</span>
                    </div>
                    <h4 className="font-bold text-sm leading-tight group-hover:text-blue-400 transition-colors">{discussion.topic}</h4>
                  </div>
                ))}
              </div>
            </section>

            {/* Featured Explorer */}
            <section className="bg-[#161827] rounded-[2.5rem] border border-white/5 p-8 relative overflow-hidden group cursor-pointer shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
              <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/20">Featured Explorer</p>
                <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-tr from-blue-600 to-indigo-600 p-1">
                  <div className="w-full h-full rounded-[1.8rem] bg-[#161827] overflow-hidden p-1">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Explorer" alt="Explorer" className="w-full h-full object-cover" />
                  </div>
                </div>
                <div>
                   <h4 className="font-black uppercase tracking-tight">Kaito Tanaka</h4>
                   <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Master Pathfinder</p>
                </div>
                <button className="px-6 py-2 bg-white text-black rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
                  Follow
                </button>
              </div>
            </section>

          </aside>
        </div>
      </main>

      <footer className="py-20 border-t border-white/5 text-center">
         <p className="text-[10px] text-white/10 font-black uppercase tracking-[0.5em]">
          Traveloop Community Feed • Explorers United
        </p>
      </footer>
    </div>
  );
}