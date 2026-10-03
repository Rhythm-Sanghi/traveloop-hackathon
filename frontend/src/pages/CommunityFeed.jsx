import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  Search,
  SlidersHorizontal,
  Users,
  ChevronRight,
  TrendingUp,
  MessageSquare,
  Bookmark,
  MoreHorizontal,
  Plus,
  Loader2,
  Send,
  X,
  MessageCircle,
  Check,
  Image,
  Compass,
} from 'lucide-react';
import api from '../api';
import Navbar from '../components/Navbar';

export default function CommunityFeed() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [feedTrips, setFeedTrips] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);

  // Community Post Form State
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [isCreatingPost, setIsCreatingPost] = useState(false);

  // Comments Section State
  const [activeCommentsPostId, setActiveCommentsPostId] = useState(null);
  const [commentsList, setCommentsList] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Group Memberships State
  const [groupCatalog, setGroupCatalog] = useState([]);
  const [joinedGroups, setJoinedGroups] = useState([]);
  const [showGroupsModal, setShowGroupsModal] = useState(false);

  // Follows State
  const [followedExplorers, setFollowedExplorers] = useState([]);

  // Bookmarks State
  const [bookmarkedItems, setBookmarkedItems] = useState({ trip: [], post: [] });

  // Likes State
  const [likedItems, setLikedItems] = useState({ trip: [], post: [] });

  // Discussions State
  const [discussions, setDiscussions] = useState([]);
  const [activeDiscussion, setActiveDiscussion] = useState(null);
  const [activeDiscussionReplies, setActiveDiscussionReplies] = useState([]);
  const [newReplyText, setNewReplyText] = useState('');
  const [repliesLoading, setRepliesLoading] = useState(false);

  // Group Space State
  const [activeGroupSpace, setActiveGroupSpace] = useState(null);
  const [groupSpaceTab, setGroupSpaceTab] = useState('chat');
  const [groupMessages, setGroupMessages] = useState([]);
  const [groupMessagesLoading, setGroupMessagesLoading] = useState(false);
  const [newGroupMsgText, setNewGroupMsgText] = useState('');

  // Hub Post Modal & Options Dropdown States
  const [activeHubPost, setActiveHubPost] = useState(null);
  const [activeOptionsMenuPostId, setActiveOptionsMenuPostId] = useState(null);
  const [profile, setProfile] = useState(null);

  const fetchFeed = async () => {
    try {
      setFeedLoading(true);
      const res = await api.get('/api/community/feed');
      setFeedTrips(res.data || []);
    } catch (err) {
      console.error('Failed to fetch community feed:', err);
    } finally {
      setFeedLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(fetchFeed);
  }, []);

  // Fetch Sidebars & Memberships on mount
  useEffect(() => {
    const fetchSidebarData = async () => {
      try {
        const [groupsRes, followsRes, discussionsRes, bookmarksRes, likesRes, profileRes] = await Promise.all([
          api.get('/api/community/groups'),
          api.get('/api/community/follows'),
          api.get('/api/community/discussions'),
          api.get('/api/community/bookmarks'),
          api.get('/api/community/likes'),
          api.get('/api/profile')
        ]);
        const joinedGroupIds = (groupsRes.data || []).filter(group => group.joined).map(group => group.id);
        setGroupCatalog(groupsRes.data || []);
        setJoinedGroups(joinedGroupIds);
        setFollowedExplorers(followsRes.data || []);
        setDiscussions(discussionsRes.data || []);
        setBookmarkedItems(bookmarksRes.data || { trip: [], post: [] });
        setLikedItems(likesRes.data || { trip: [], post: [] });
        setProfile(profileRes.data);
      } catch (err) {
        console.error("Failed to fetch sidebar info:", err);
      }
    };
    queueMicrotask(fetchSidebarData);
  }, []);

  useEffect(() => {
    if (activeHubPost) {
      const loadComments = async () => {
        const postType = activeHubPost.isRealTrip ? 'trip' : 'post';
        const targetId = activeHubPost.isRealTrip ? activeHubPost.tripId : activeHubPost.postId;
        setActiveCommentsPostId(activeHubPost.id);
        setCommentsList([]);
        setNewCommentText('');
        setCommentsLoading(true);
        try {
          const response = await api.get(`/api/community/comments?post_type=${postType}&target_id=${targetId}`);
          setCommentsList(response.data || []);
        } catch (err) {
          console.error("Failed to fetch comments for active post:", err);
        } finally {
          setCommentsLoading(false);
        }
      };
      queueMicrotask(loadComments);
    }
  }, [activeHubPost]);

  const handleLike = async (post) => {
    const targetId = post.isRealTrip ? post.tripId : post.postId;
    try {
      if (post.isRealTrip) {
        const res = await api.post(`/api/trips/${post.tripId}/like`);
        setFeedTrips(prev => prev.map(item => 
          item.tripId === post.tripId ? { ...item, likesCount: res.data.likes } : item
        ));
        if (res.data.liked) {
          setLikedItems(prev => ({ ...prev, trip: [...prev.trip, targetId] }));
        } else {
          setLikedItems(prev => ({ ...prev, trip: prev.trip.filter(id => id !== targetId) }));
        }
      } else {
        const res = await api.post(`/api/community/posts/${post.postId}/like`);
        setFeedTrips(prev => prev.map(item => 
          item.postId === post.postId ? { ...item, likesCount: res.data.likes } : item
        ));
        if (res.data.liked) {
          setLikedItems(prev => ({ ...prev, post: [...prev.post, targetId] }));
        } else {
          setLikedItems(prev => ({ ...prev, post: prev.post.filter(id => id !== targetId) }));
        }
      }
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  };

  const handleClone = async (tripId) => {
    try {
      await api.post(`/api/trips/${tripId}/clone`);
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to clone trip:', err);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostContent.trim()) return;
    try {
      setIsCreatingPost(true);
      await api.post('/api/community/posts', {
        title: newPostTitle,
        content: newPostContent,
        image_url: newPostImage || null
      });
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostImage('');
      await fetchFeed();
    } catch (err) {
      console.error("Failed to create community post:", err);
    } finally {
      setIsCreatingPost(false);
    }
  };

  const toggleComments = async (id, postType, targetId) => {
    if (activeCommentsPostId === id) {
      setActiveCommentsPostId(null);
      setCommentsList([]);
      return;
    }
    setActiveCommentsPostId(id);
    setCommentsList([]);
    setNewCommentText('');
    try {
      setCommentsLoading(true);
      const res = await api.get(`/api/community/comments?post_type=${postType}&target_id=${targetId}`);
      setCommentsList(res.data || []);
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleAddComment = async (postType, targetId) => {
    if (!newCommentText.trim()) return;
    try {
      const res = await api.post('/api/community/comments', {
        post_type: postType,
        target_id: targetId,
        content: newCommentText
      });
      setCommentsList(prev => [...prev, res.data]);
      setNewCommentText('');
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  const handleToggleGroup = async (groupId) => {
    try {
      const res = await api.post(`/api/community/groups/${groupId}/toggle`);
      if (res.data.joined) {
        setJoinedGroups(prev => [...prev, groupId]);
      } else {
        setJoinedGroups(prev => prev.filter(id => id !== groupId));
      }
    } catch (err) {
      console.error("Failed to toggle group membership:", err);
    }
  };

  const handleToggleFollow = async (name) => {
    try {
      const res = await api.post(`/api/community/follow/${name}`);
      if (res.data.following) {
        setFollowedExplorers(prev => [...prev, name]);
      } else {
        setFollowedExplorers(prev => prev.filter(n => n !== name));
      }
    } catch (err) {
      console.error("Failed to toggle follow:", err);
    }
  };

  const handleOpenGroupSpace = async (group) => {
    setActiveGroupSpace(group);
    setGroupSpaceTab('chat');
    setGroupMessages([]);
    setNewGroupMsgText('');
    try {
      setGroupMessagesLoading(true);
      const res = await api.get(`/api/community/groups/${group.id}/messages`);
      setGroupMessages(res.data || []);
    } catch (err) {
      console.error("Failed to load group messages:", err);
    } finally {
      setGroupMessagesLoading(false);
    }
  };

  const handleSendGroupMessage = async () => {
    if (!newGroupMsgText.trim() || !activeGroupSpace) return;
    try {
      const res = await api.post(`/api/community/groups/${activeGroupSpace.id}/messages`, {
        content: newGroupMsgText
      });
      setGroupMessages(prev => [...prev, res.data]);
      setNewGroupMsgText('');
    } catch (err) {
      console.error("Failed to send group message:", err);
    }
  };

  const handleToggleBookmark = async (post) => {
    const itemType = post.isRealTrip ? 'trip' : 'post';
    const targetId = post.isRealTrip ? post.tripId : post.postId;
    try {
      const res = await api.post(`/api/community/bookmarks/${itemType}/${targetId}/toggle`);
      if (res.data.bookmarked) {
        setBookmarkedItems(prev => ({
          ...prev,
          [itemType]: [...prev[itemType], targetId]
        }));
      } else {
        setBookmarkedItems(prev => ({
          ...prev,
          [itemType]: prev[itemType].filter(id => id !== targetId)
        }));
      }
    } catch (err) {
      console.error("Failed to toggle bookmark:", err);
    }
  };

  const isBookmarked = (post) => {
    const itemType = post.isRealTrip ? 'trip' : 'post';
    const targetId = post.isRealTrip ? post.tripId : post.postId;
    return bookmarkedItems[itemType]?.includes(targetId);
  };

  const isLiked = (post) => {
    const itemType = post.isRealTrip ? 'trip' : 'post';
    const targetId = post.isRealTrip ? post.tripId : post.postId;
    return likedItems[itemType]?.includes(targetId);
  };

  const handleOpenDiscussion = async (discussion) => {
    setActiveDiscussion(discussion);
    setActiveDiscussionReplies([]);
    setNewReplyText('');
    try {
      setRepliesLoading(true);
      const res = await api.get(`/api/community/discussions/${discussion.id}/replies`);
      setActiveDiscussionReplies(res.data || []);
    } catch (err) {
      console.error("Failed to fetch discussion replies:", err);
    } finally {
      setRepliesLoading(false);
    }
  };

  const handleAddReply = async () => {
    if (!newReplyText.trim() || !activeDiscussion) return;
    try {
      const res = await api.post(`/api/community/discussions/${activeDiscussion.id}/replies`, {
        content: newReplyText
      });
      setActiveDiscussionReplies(prev => [...prev, res.data]);
      setNewReplyText('');
      const listRes = await api.get('/api/community/discussions');
      setDiscussions(listRes.data || []);
    } catch (err) {
      console.error("Failed to post discussion reply:", err);
    }
  };

  const displayPosts = useMemo(() => {
    return feedTrips;
  }, [feedTrips]);

  const filteredPosts = useMemo(() => {
    return displayPosts.filter(post =>
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.contentPreview.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [displayPosts, searchQuery]);

  const groupTrips = useMemo(() => {
    if (!activeGroupSpace) return [];
    return feedTrips.filter(t => t.isRealTrip).slice(0, 3);
  }, [activeGroupSpace, feedTrips]);

  return (
    <div className="min-h-screen bg-[#0b0c14] text-white selection:bg-blue-500/30">
      
      <Navbar />

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
            <button aria-label="Filter community stories" className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-white/40 hover:text-white">
              <SlidersHorizontal size={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Main Feed Column */}
          <div className="flex-1 space-y-10">
            {/* Create Story Form */}
            <form onSubmit={handleCreatePost} className="bg-[#161827] rounded-[2.5rem] border border-white/5 p-8 space-y-6 shadow-2xl">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 overflow-hidden border border-white/10 p-0.5 flex-shrink-0">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Traveloop" alt="User Avatar" className="w-full h-full object-cover rounded-[0.9rem]" />
                </div>
                <div className="flex-1 space-y-4">
                  <input 
                    type="text" 
                    placeholder="Title of your travel story..."
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-white/20 font-bold"
                    required
                  />
                  <textarea 
                    placeholder="Share your latest adventure details or travel tips with the community..."
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-white/20 resize-none font-medium text-slate-300"
                    required
                  />
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <Image className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                      <input 
                        type="text" 
                        placeholder="Optional image URL (e.g. Unsplash link)..."
                        value={newPostImage}
                        onChange={(e) => setNewPostImage(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-white/20 text-slate-300"
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={isCreatingPost}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 self-end sm:self-auto"
                    >
                      {isCreatingPost ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      Post to Hub
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {feedLoading ? (
              <div className="py-20 flex flex-col items-center justify-center bg-[#161827] border border-white/5 rounded-[2.5rem] space-y-4">
                 <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                 <p className="text-xs font-black uppercase tracking-widest text-slate-500">Loading public journeys...</p>
              </div>
            ) : filteredPosts.length > 0 ? (
              filteredPosts.map((post) => (
                <article 
                  key={post.id}
                  className="bg-[#161827] rounded-[2.5rem] border border-white/5 overflow-hidden hover:border-white/10 transition-all shadow-2xl group p-8 space-y-6"
                >
                  {/* Post Header */}
                  <div className="flex items-center justify-between relative">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 overflow-hidden border border-white/10 p-0.5">
                        <img src={post.avatarUrl} alt={post.authorName} className="w-full h-full object-cover rounded-[0.9rem]" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm uppercase tracking-tight">{post.authorName}</h4>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/20">{post.timestamp}</p>
                      </div>
                    </div>
                    <div className="relative">
                      <button 
                        aria-label={`More options for ${post.authorName}'s post`}
                        onClick={(e) => { e.stopPropagation(); setActiveOptionsMenuPostId(activeOptionsMenuPostId === post.id ? null : post.id); }}
                        className="p-2 text-white/20 hover:text-white transition-colors cursor-pointer"
                      >
                        <MoreHorizontal size={20} />
                      </button>
                      {activeOptionsMenuPostId === post.id && (
                        <div className="absolute right-0 top-10 z-30 bg-[#161827] border border-white/10 rounded-2xl w-48 shadow-2xl p-2 animate-in fade-in duration-200">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const targetId = post.isRealTrip ? post.tripId : post.postId;
                              navigator.clipboard.writeText(`${window.location.origin}/community/post/${targetId}`);
                              alert("Post share link copied to clipboard!");
                              setActiveOptionsMenuPostId(null);
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-white/5 text-xs font-bold text-slate-300 hover:text-white rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                          >
                            Copy Link
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              alert("Thank you! This post has been reported to the community moderators.");
                              setActiveOptionsMenuPostId(null);
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-white/5 text-xs font-bold text-slate-300 hover:text-white rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                          >
                            Report Post
                          </button>
                          {(!post.isRealTrip && post.authorName === profile?.username) && (
                            <button 
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm("Are you sure you want to delete this post?")) {
                                  try {
                                    await api.delete(`/api/community/posts/${post.postId}`);
                                    setActiveOptionsMenuPostId(null);
                                    fetchFeed();
                                  } catch (err) {
                                    console.error("Failed to delete post:", err);
                                  }
                                }
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-red-500/10 text-xs font-bold text-red-400 hover:text-red-300 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                            >
                              Delete Post
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Post Image */}
                  {post.image && (
                    <div 
                      onClick={() => post.isRealTrip ? navigate(`/trip/public/${post.tripId}`) : setActiveHubPost(post)}
                      className="cursor-pointer"
                    >
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
                  <div className="space-y-4">
                    <h2 
                      onClick={() => post.isRealTrip ? navigate(`/trip/public/${post.tripId}`) : setActiveHubPost(post)}
                      className="text-2xl font-black uppercase tracking-tight group-hover:text-blue-400 transition-colors cursor-pointer hover:underline"
                    >
                      {post.title}
                    </h2>
                    <p className="text-slate-400 leading-relaxed font-medium">
                      {post.contentPreview}
                    </p>

                    <div className="pt-6 flex items-center justify-between border-t border-white/5">
                      <div className="flex items-center gap-6">
                        <button 
                          aria-label={`${isLiked(post) ? 'Unlike' : 'Like'} ${post.title}`}
                          onClick={() => handleLike(post)}
                          className="flex items-center gap-2 group/btn cursor-pointer"
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            isLiked(post)
                              ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                              : 'bg-white/5 group-hover/btn:bg-rose-500/10 group-hover/btn:text-rose-500 border border-transparent'
                          }`}>
                            <Heart size={18} className={isLiked(post) ? "fill-rose-500 text-rose-500" : ""} />
                          </div>
                          <span className={`text-xs font-black transition-colors ${isLiked(post) ? 'text-rose-400 font-bold' : 'text-white/40 group-hover/btn:text-white'}`}>{post.likesCount}</span>
                        </button>
                        
                        <button 
                          aria-label={`${activeCommentsPostId === post.id ? 'Hide' : 'View'} comments for ${post.title}`}
                          onClick={() => toggleComments(post.id, post.isRealTrip ? 'trip' : 'post', post.isRealTrip ? post.tripId : post.postId)}
                          className={`flex items-center gap-2 group/btn ${activeCommentsPostId === post.id ? 'text-blue-500' : ''}`}
                        >
                          <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover/btn:bg-blue-500/10 group-hover/btn:text-blue-500 transition-all ${activeCommentsPostId === post.id ? 'bg-blue-500/10 text-blue-500' : ''}`}>
                            <MessageSquare size={18} />
                          </div>
                          <span className="text-xs font-black text-white/40 group-hover/btn:text-white transition-colors">
                            {activeCommentsPostId === post.id ? commentsList.length : 'View'}
                          </span>
                        </button>
                        
                        {post.isRealTrip && (
                          <button 
                            onClick={() => handleClone(post.tripId)}
                            className="flex items-center gap-2 px-5 py-2 bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600 hover:text-white text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-md shadow-blue-500/10"
                          >
                            Clone Trip
                          </button>
                        )}
                      </div>
                      <button 
                        aria-label={`${isBookmarked(post) ? 'Remove bookmark from' : 'Bookmark'} ${post.title}`}
                        onClick={() => handleToggleBookmark(post)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                          isBookmarked(post)
                            ? 'bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold'
                            : 'bg-white/5 border border-transparent text-white/40 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <Bookmark size={18} className={isBookmarked(post) ? "fill-blue-400" : ""} />
                      </button>
                    </div>

                    {/* Expanded Comments Drawer */}
                    {activeCommentsPostId === post.id && (
                      <div className="mt-6 pt-6 border-t border-white/5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                          <MessageCircle size={12} className="text-blue-500" />
                          Discussion Replies
                        </h4>
                        
                        {commentsLoading ? (
                          <div className="py-6 flex justify-center">
                            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                          </div>
                        ) : (
                          <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                            {commentsList.length > 0 ? (
                              commentsList.map((comment) => (
                                <div key={comment.id} className="flex gap-3 text-sm bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                                  <div className="w-8 h-8 rounded-xl bg-white/5 overflow-hidden border border-white/10 p-0.5 flex-shrink-0">
                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author_name}`} alt="avatar" className="w-full h-full object-cover rounded-lg" />
                                  </div>
                                  <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-black text-xs uppercase tracking-tight text-white/80">{comment.author_name}</span>
                                      <span className="text-[8px] font-black uppercase tracking-widest text-white/20">{comment.created_at}</span>
                                    </div>
                                    <p className="text-slate-400 font-medium text-xs">{comment.content}</p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-slate-600 font-black uppercase tracking-widest py-4 text-center">Be the first to reply!</p>
                            )}
                          </div>
                        )}

                        {/* Comment Input */}
                        <div className="flex gap-3">
                            <input 
                              type="text" 
                              placeholder="Write a helpful response..."
                              value={newCommentText}
                              onChange={(e) => setNewCommentText(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.isRealTrip ? 'trip' : 'post', post.isRealTrip ? post.tripId : post.postId)}
                              className="flex-1 bg-[#0b0c14] border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-white/20 text-white"
                            />
                            <button 
                              onClick={() => handleAddComment(post.isRealTrip ? 'trip' : 'post', post.isRealTrip ? post.tripId : post.postId)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                            >
                              Reply
                            </button>
                        </div>
                      </div>
                    )}
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
                {groupCatalog.length > 0 ? groupCatalog.map((group) => {
                  const isJoined = joinedGroups.includes(group.id);
                  return (
                    <div key={group.id} className="flex items-center gap-4 group cursor-pointer" onClick={() => handleOpenGroupSpace({ ...group, coverImage: group.cover_image, memberCount: group.member_count })}>
                      <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0">
                        <img src={group.cover_image} alt={group.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="flex-1 min-w-0 cursor-pointer">
                        <h4 className="font-black text-sm uppercase tracking-tight truncate group-hover:text-blue-400 transition-colors">{group.name}</h4>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/20">
                          {isJoined ? 'Joined ✓' : `${group.member_count.toLocaleString()} members`}
                        </p>
                      </div>
                      <button 
                        aria-label={isJoined ? `Leave ${group.name}` : `Join ${group.name}`}
                        onClick={(e) => { e.stopPropagation(); handleToggleGroup(group.id); }}
                        className={`p-2 rounded-xl transition-all cursor-pointer ${isJoined ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/20 hover:text-white hover:bg-white/10'}`}
                      >
                        {isJoined ? <Check size={16} /> : <Plus size={16} />}
                      </button>
                    </div>
                  );
                }) : (
                  <p className="text-xs text-slate-500 uppercase tracking-widest">No active groups yet.</p>
                )}
              </div>

              <button 
                onClick={() => setShowGroupsModal(true)}
                className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
              >
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
                {discussions.map((discussion) => (
                  <div 
                    key={discussion.id} 
                    onClick={() => handleOpenDiscussion(discussion)}
                    className="space-y-2 group cursor-pointer bg-white/[0.02] border border-white/5 p-4 rounded-2xl hover:border-white/10 hover:bg-white/5 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[8px] font-black uppercase tracking-widest">
                        {discussion.category}
                      </span>
                      <span className="text-[8px] font-black uppercase tracking-widest text-white/20">{discussion.reply_count || discussion.replyCount} replies</span>
                    </div>
                    <h4 className="font-bold text-sm leading-tight group-hover:text-blue-400 transition-colors">{discussion.topic}</h4>
                  </div>
                ))}
              </div>
            </section>

            {/* Featured Explorer */}
            <section className="bg-[#161827] rounded-[2.5rem] border border-white/5 p-8 relative overflow-hidden group shadow-2xl">
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
                <button 
                  onClick={() => handleToggleFollow('Kaito Tanaka')}
                  className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all cursor-pointer ${followedExplorers.includes('Kaito Tanaka') ? 'bg-blue-600 text-white border border-blue-500' : 'bg-white text-black'}`}
                >
                  {followedExplorers.includes('Kaito Tanaka') ? 'Following ✓' : 'Follow'}
                </button>
              </div>
            </section>

          </aside>
        </div>
      </main>

      {/* Trending Discussions Details Modal */}
      {activeDiscussion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#161827] border border-white/10 rounded-[2.5rem] max-w-lg w-full overflow-hidden shadow-2xl relative flex flex-col max-h-[80vh]">
            {/* Modal Header */}
            <div className="p-8 border-b border-white/5 flex justify-between items-start">
              <div className="space-y-2">
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[8px] font-black uppercase tracking-widest">
                  {activeDiscussion.category}
                </span>
                <h3 className="text-xl font-black uppercase tracking-tight text-white leading-tight">
                  {activeDiscussion.topic}
                </h3>
              </div>
              <button 
                onClick={() => setActiveDiscussion(null)}
                className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/60 hover:text-white transition-all"
              >
                <X size={16} />
              </button>
            </div>
            
            {/* Modal Replies List */}
            <div className="flex-1 p-8 overflow-y-auto space-y-4">
              {repliesLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Loading replies...</p>
                </div>
              ) : activeDiscussionReplies.length > 0 ? (
                activeDiscussionReplies.map((reply) => (
                  <div key={reply.id} className="flex gap-3 text-sm bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                    <div className="w-8 h-8 rounded-xl bg-white/5 overflow-hidden border border-white/10 p-0.5 flex-shrink-0">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.author_name}`} alt="avatar" className="w-full h-full object-cover rounded-lg" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs uppercase tracking-tight text-white/80">{reply.author_name}</span>
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/20">{reply.created_at}</span>
                      </div>
                      <p className="text-slate-400 font-medium text-xs leading-relaxed">{reply.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-600 font-black uppercase tracking-widest text-xs">
                  No replies yet. Join the conversation!
                </div>
              )}
            </div>
            
            {/* Modal Reply Form */}
            <div className="p-8 border-t border-white/5 bg-white/[0.01] flex gap-3">
              <input 
                type="text" 
                placeholder="Share your thoughts or answer..."
                value={newReplyText}
                onChange={(e) => setNewReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddReply()}
                className="flex-1 bg-[#0b0c14] border border-white/10 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-white/20 text-white"
              />
              <button 
                onClick={handleAddReply}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-md shadow-blue-500/15 flex items-center gap-1.5"
              >
                <Send size={10} />
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Explore All Groups Modal */}
      {showGroupsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#161827] border border-white/10 rounded-[2.5rem] max-w-lg w-full overflow-hidden shadow-2xl relative flex flex-col max-h-[80vh]">
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-xl font-black uppercase tracking-tight text-white">
                All Traveloop Groups
              </h3>
              <button 
                onClick={() => setShowGroupsModal(false)}
                className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/60 hover:text-white transition-all"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="flex-1 p-8 overflow-y-auto space-y-6">
              {groupCatalog.length > 0 ? groupCatalog.map((group) => {
                const isJoined = joinedGroups.includes(group.id);
                const normalizedGroup = { ...group, coverImage: group.cover_image, memberCount: group.member_count };
                return (
                  <div key={group.id} onClick={() => { setShowGroupsModal(false); handleOpenGroupSpace(normalizedGroup); }} className="flex items-center justify-between gap-4 p-4 bg-white/[0.01] border border-white/5 rounded-2xl hover:border-white/10 transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0">
                        <img src={normalizedGroup.coverImage} alt={group.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm uppercase tracking-tight text-white">{group.name}</h4>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/20">{normalizedGroup.memberCount.toLocaleString()} members</p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleToggleGroup(group.id); }}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${isJoined ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'}`}
                    >
                      {isJoined ? 'Joined ✓' : 'Join'}
                    </button>
                  </div>
                );
              }) : (
                <p className="text-xs text-slate-500 uppercase tracking-widest">No groups available yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Group Space Modal Overlay */}
      {activeGroupSpace && (() => {
        const isJoined = joinedGroups.includes(activeGroupSpace.id);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[#161827] border border-white/10 rounded-[2.5rem] max-w-xl w-full overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] relative flex flex-col h-[80vh]">
              {/* Header Cover Banner */}
              <div className="h-44 w-full overflow-hidden relative flex-shrink-0">
                <img src={activeGroupSpace.coverImage} alt={activeGroupSpace.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#161827] via-[#161827]/40 to-transparent" />
                <button 
                  onClick={() => setActiveGroupSpace(null)}
                  className="absolute top-4 right-4 p-2.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-white/10 transition-all cursor-pointer z-10"
                >
                  <X size={16} />
                </button>
                
                {/* Group Meta Info */}
                <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black uppercase tracking-tight text-white leading-none">
                      {activeGroupSpace.name}
                    </h3>
                    <p className="text-xs font-black uppercase tracking-widest text-blue-400">
                      {activeGroupSpace.memberCount || '15k'} Members
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleGroup(activeGroupSpace.id)}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-md ${
                      isJoined 
                        ? 'bg-blue-600/30 border border-blue-500/50 text-blue-400 hover:bg-blue-600/50' 
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25'
                    }`}
                  >
                    {isJoined ? 'Joined ✓' : 'Join Group'}
                  </button>
                </div>
              </div>

              {/* Tabs Navigation Row */}
              <div className="flex border-b border-white/5 bg-white/[0.01] px-6 flex-shrink-0">
                {['chat', 'itineraries', 'members'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setGroupSpaceTab(tab)}
                    className={`px-4 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                      groupSpaceTab === tab 
                        ? 'border-blue-500 text-blue-400' 
                        : 'border-transparent text-white/40 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Content Panel */}
              <div className="flex-1 p-6 overflow-y-auto min-h-0">
                {groupSpaceTab === 'chat' && (
                  <div className="h-full flex flex-col">
                    {/* Chat Messages Log */}
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4 scrollbar-hide">
                      {groupMessagesLoading ? (
                        <div className="h-full flex items-center justify-center">
                          <Loader2 size={24} className="text-blue-500 animate-spin" />
                        </div>
                      ) : groupMessages.length > 0 ? (
                        groupMessages.map((msg) => (
                          <div key={msg.id} className="flex gap-3 text-sm bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                            <div className="w-8 h-8 rounded-xl bg-white/5 overflow-hidden border border-white/10 p-0.5 flex-shrink-0">
                              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.author_name}`} alt="avatar" className="w-full h-full object-cover rounded-lg" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-xs uppercase tracking-tight text-slate-300">{msg.author_name}</span>
                                <span className="text-[8px] text-white/20 uppercase tracking-widest">{msg.created_at}</span>
                              </div>
                              <p className="text-slate-400 font-medium">{msg.content}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center text-white/20 space-y-2">
                          <MessageSquare size={36} strokeWidth={1.5} />
                          <p className="text-xs font-black uppercase tracking-widest">No group chat messages yet</p>
                        </div>
                      )}
                    </div>

                    {/* Chat Text Box Input */}
                    <div className="border-t border-white/5 pt-4">
                      {isJoined ? (
                        <div className="flex gap-3">
                          <input
                            type="text"
                            placeholder="Type a message to the group space..."
                            value={newGroupMsgText}
                            onChange={(e) => setNewGroupMsgText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendGroupMessage()}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-white/20 text-slate-300 font-medium"
                          />
                          <button
                            onClick={handleSendGroupMessage}
                            className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20"
                          >
                            Send
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl text-center">
                          <p className="text-yellow-400/80 text-[10px] font-black uppercase tracking-widest">
                            Join this group to send messages and connect with other travelers!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {groupSpaceTab === 'itineraries' && (
                  <div className="space-y-4">
                    {groupTrips.length > 0 ? (
                      groupTrips.map((trip) => (
                        <div 
                          key={trip.id}
                          onClick={() => navigate(`/trip/public/${trip.tripId}`)}
                          className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/10 hover:bg-white/5 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
                              <img src={trip.image} alt={trip.title} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <h4 className="font-black text-sm uppercase tracking-tight text-white">{trip.title}</h4>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Shared by {trip.authorName}</p>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-white/40" />
                        </div>
                      ))
                    ) : (
                      <div className="py-12 flex flex-col items-center justify-center text-center text-white/20 space-y-2">
                        <Compass size={36} strokeWidth={1.5} />
                        <p className="text-xs font-black uppercase tracking-widest">No shared itineraries for this group yet</p>
                      </div>
                    )}
                  </div>
                )}

                {groupSpaceTab === 'members' && (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-white/20 space-y-2">
                    <Users size={36} strokeWidth={1.5} />
                    <p className="text-xs font-black uppercase tracking-widest">No members yet</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Join the group to start building the community.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Hub Post Details Modal */}
      {activeHubPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#161827] border border-white/10 rounded-[2.5rem] max-w-2xl w-full overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] relative flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-8 border-b border-white/5 flex justify-between items-start flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 overflow-hidden border border-white/10 p-0.5">
                  <img src={activeHubPost.avatarUrl} alt={activeHubPost.authorName} className="w-full h-full object-cover rounded-[0.9rem]" />
                </div>
                <div>
                  <h4 className="font-black text-sm uppercase tracking-tight text-white">{activeHubPost.authorName}</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/20">{activeHubPost.timestamp}</p>
                </div>
              </div>
              <button 
                onClick={() => { setActiveHubPost(null); setActiveCommentsPostId(null); }}
                className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/60 hover:text-white transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content Scroll Area */}
            <div className="flex-1 p-8 overflow-y-auto space-y-6 min-h-0">
              {/* Post Title */}
              <h2 className="text-3xl font-black uppercase tracking-tight text-white leading-tight">
                {activeHubPost.title}
              </h2>

              {/* Post Image */}
              {activeHubPost.image && (
                <div className="rounded-3xl overflow-hidden border border-white/5 max-h-[300px]">
                  <img src={activeHubPost.image} alt={activeHubPost.title} className="w-full h-full object-cover" />
                </div>
              )}

              {/* Post Content */}
              <p className="text-slate-400 leading-relaxed font-medium text-sm">
                {activeHubPost.contentPreview}
              </p>

              {/* Like / Bookmark Actions */}
              <div className="pt-6 flex items-center justify-between border-t border-white/5">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handleLike(activeHubPost)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all cursor-pointer ${
                      isLiked(activeHubPost)
                        ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                        : 'bg-white/5 hover:bg-white/10 text-white/40 hover:text-white border border-transparent'
                    }`}
                  >
                    <Heart size={16} className={isLiked(activeHubPost) ? "fill-rose-500" : ""} />
                    <span className="text-xs font-black">{activeHubPost.likesCount}</span>
                  </button>
                  <button 
                    onClick={() => handleToggleBookmark(activeHubPost)}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                      isBookmarked(activeHubPost)
                        ? 'bg-blue-600/20 border border-blue-500/30 text-blue-400'
                        : 'bg-white/5 border border-transparent text-white/40 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Bookmark size={18} className={isBookmarked(activeHubPost) ? "fill-blue-400" : ""} />
                  </button>
                </div>
              </div>

              {/* Comments Section */}
              <div className="pt-8 border-t border-white/5 space-y-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <MessageCircle size={12} className="text-blue-500" />
                  Discussion Replies
                </h3>

                {/* Reply Input Box */}
                <div className="flex gap-3">
                  <input 
                    type="text"
                    placeholder="Write a comment..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment(activeHubPost.isRealTrip ? 'trip' : 'post', activeHubPost.isRealTrip ? activeHubPost.tripId : activeHubPost.postId)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-white/20 text-slate-300 font-medium"
                  />
                  <button 
                    onClick={() => handleAddComment(activeHubPost.isRealTrip ? 'trip' : 'post', activeHubPost.isRealTrip ? activeHubPost.tripId : activeHubPost.postId)}
                    className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer shadow-lg shadow-blue-500/20"
                  >
                    Post
                  </button>
                </div>

                {/* Comments List */}
                <div className="space-y-4">
                  {commentsLoading ? (
                    <div className="py-6 flex justify-center">
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    </div>
                  ) : commentsList.length > 0 ? (
                    commentsList.map((comment) => (
                      <div key={comment.id} className="flex gap-3 text-sm bg-white/[0.01] p-4 border border-white/5 rounded-2xl">
                        <div className="w-8 h-8 rounded-xl bg-white/5 overflow-hidden border border-white/10 p-0.5 flex-shrink-0">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author_name}`} alt="avatar" className="w-full h-full object-cover rounded-lg" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs uppercase tracking-tight text-slate-300">{comment.author_name}</span>
                            <span className="text-[8px] text-white/20 uppercase tracking-widest">{comment.created_at}</span>
                          </div>
                          <p className="text-slate-400 font-medium">{comment.content}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-white/20 text-xs font-black uppercase tracking-widest">
                      No replies yet. Be the first to start the discussion!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="py-20 border-t border-white/5 text-center">
         <p className="text-[10px] text-white/10 font-black uppercase tracking-[0.5em]">
          Traveloop Community Feed • Explorers United
        </p>
      </footer>
    </div>
  );
}