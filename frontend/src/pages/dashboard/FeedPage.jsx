import { useEffect, useState, useCallback, useRef } from "react";
import { getFeedPosts, createPost } from "../../services/feedService";
import PostCard from "../../components/feed/PostCard";
import CreatePost from "../../components/feed/CreatePost";
import { searchUsers } from "../../services/searchService";
import debounce from "lodash/debounce";

const FeedPage = () => {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const createPostRef = useRef(null);
  const observer = useRef();
  const feedRef = useRef(null);

  // Fetch Posts
  const fetchPosts = async (currentPage = 1, append = false) => {
    try {
      if (currentPage === 1) {
        setLoading(true);
        setInitialLoading(true);
      } else {
        setLoadingMore(true);
      }

      const data = await getFeedPosts(currentPage);

      setPosts((prev) =>
        append ? [...prev, ...(data.posts || [])] : data.posts || [],
      );

      setHasNext(data.pagination?.hasNext);
      setPage(currentPage);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch posts");
    } finally {
      setLoading(false);
      setInitialLoading(false);
      setLoadingMore(false);
    }
  };

  // Infinite scroll observer
  const lastPostRef = useCallback(
    (node) => {
      if (loading || loadingMore) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNext) {
          fetchPosts(page + 1, true);
        }
      }, { threshold: 0.1, rootMargin: "100px" });

      if (node) observer.current.observe(node);
    },
    [loading, loadingMore, hasNext, page],
  );

  // Load Feed
  useEffect(() => {
    fetchPosts();
  }, [refreshKey]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
      if (
        createPostRef.current &&
        !createPostRef.current.contains(event.target) &&
        showCreatePost
      ) {
        setShowCreatePost(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCreatePost]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(async (searchTerm) => {
      if (!searchTerm.trim()) {
        setResults([]);
        setShowSearchResults(false);
        return;
      }

      try {
        const data = await searchUsers(searchTerm);
        setResults(data.users || []);
        setShowSearchResults(true);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      }
    }, 300),
    [],
  );

  const handleSearch = (value) => {
    setSearch(value);
    debouncedSearch(value);
  };

  const clearSearch = () => {
    setSearch("");
    setResults([]);
    setShowSearchResults(false);
    searchInputRef.current?.focus();
  };

  const handleUserClick = (userId) => {
    window.location.href = `/dashboard/user/${userId}`;
  };

  const handleCreatePost = async (postData) => {
    try {
      setCreating(true);
      const newPost = await createPost(postData);
      setPosts((prevPosts) => [newPost.data, ...prevPosts]);
      setShowCreatePost(false);
      feedRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      console.error("Create post error:", err);
      alert(err.response?.data?.message || "Failed to create post");
    } finally {
      setCreating(false);
    }
  };

  const handleImageClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  const refreshFeed = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Skeleton Loading State
  if (initialLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div style={{...styles.skeleton, width: '250px', height: '40px', marginBottom: '10px'}}></div>
            <div style={{...styles.skeleton, width: '180px', height: '20px'}}></div>
          </div>
        </div>
        <div style={styles.content}>
          <div style={{...styles.skeleton, width: '100%', height: '52px', borderRadius: '16px', marginBottom: '20px'}}></div>
          <div style={{...styles.skeleton, width: '100%', height: '64px', borderRadius: '20px', marginBottom: '20px'}}></div>
          <div style={{...styles.skeleton, width: '100%', height: '320px', borderRadius: '20px', marginBottom: '20px'}}></div>
          <div style={{...styles.skeleton, width: '100%', height: '320px', borderRadius: '20px', marginBottom: '20px'}}></div>
          <div style={{...styles.skeleton, width: '100%', height: '320px', borderRadius: '20px', marginBottom: '20px'}}></div>
        </div>
      </div>
    );
  }

  // Error State
  if (error && posts.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>Campus Feed</h1>
            <p style={styles.subtitle}>Stay updated with the latest activities</p>
          </div>
        </div>
        <div style={styles.content}>
          <div style={styles.errorContainer}>
            <div style={styles.errorIcon}>⚠️</div>
            <h3>Unable to load feed</h3>
            <p>{error}</p>
            <button onClick={refreshFeed} style={styles.retryBtn}>Try Again</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} ref={feedRef}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>Campus Feed</h1>
          <p style={styles.subtitle}>Stay updated with the latest activities</p>
        </div>
      </div>

      <div style={styles.content}>
        {/* Search Section */}
        <div style={styles.searchSection} ref={searchRef}>
          <div style={styles.searchWrapper}>
            <svg style={styles.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search students by name or email..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              style={styles.searchInput}
            />
            {search && (
              <button onClick={clearSearch} style={styles.clearBtn}>✕</button>
            )}
          </div>

          {/* Search Results */}
          {showSearchResults && search && (
            <div style={styles.searchResults}>
              {results.length === 0 ? (
                <div style={styles.noResults}>
                  <div style={styles.noResultsIcon}>🔍</div>
                  <p>No students found</p>
                  <span>Try a different name or email</span>
                </div>
              ) : (
                <div style={styles.resultsList}>
                  {results.map((user) => (
                    <div
                      key={user._id}
                      onClick={() => handleUserClick(user._id)}
                      style={styles.userResult}
                    >
                      <div style={styles.userAvatar}>
                        {user.profilePicture ? (
                          <img src={user.profilePicture} alt={user.name} style={styles.avatarImg} />
                        ) : (
                          <div style={styles.avatarPlaceholder}>
                            {user.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div style={styles.userInfo}>
                        <div style={styles.userName}>{user.name}</div>
                        <div style={styles.userEmail}>{user.email}</div>
                      </div>
                      <div style={styles.viewBtn}>→</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Create Post Section */}
        <div style={styles.createPostWrapper} ref={createPostRef}>
          {!showCreatePost ? (
            <div style={styles.createPostCompact} onClick={() => setShowCreatePost(true)}>
              <div style={styles.compactAvatar}>
                <div style={styles.compactAvatarPlaceholder}>👤</div>
              </div>
              <div style={styles.compactInput}>
                <span style={styles.compactPlaceholder}>What's on your mind?</span>
              </div>
              <div style={styles.compactActions}>
                <button style={styles.compactMediaBtn}>📷</button>
              </div>
            </div>
          ) : (
            <div style={styles.createPostExpanded}>
              <CreatePost
                onCreatePost={handleCreatePost}
                creating={creating}
                onCancel={() => setShowCreatePost(false)}
              />
            </div>
          )}
        </div>

        {/* Posts Feed */}
        <div style={styles.postsFeed}>
          {posts.length === 0 ? (
            <div style={styles.emptyFeed}>
              <div style={styles.emptyIcon}>📝</div>
              <h3>No posts yet</h3>
              <p>Be the first to share something with the campus community!</p>
              <button onClick={() => setShowCreatePost(true)} style={styles.createFirstBtn}>
                Create First Post
              </button>
            </div>
          ) : (
            posts.map((post, index) => (
              <div
                key={post._id}
                ref={index === posts.length - 1 ? lastPostRef : null}
                style={{...styles.postItem, animationDelay: `${index * 0.05}s`}}
              >
                <PostCard post={post} onImageClick={handleImageClick} />
              </div>
            ))
          )}

          {/* Loading More */}
          {loadingMore && (
            <div style={styles.loadingMore}>
              <div style={styles.spinner}></div>
              <p style={styles.loadingMoreText}>Loading more posts...</p>
            </div>
          )}

          {/* End of Feed */}
          {!hasNext && posts.length > 0 && (
            <div style={styles.endOfFeed}>
              <div style={styles.endLine}></div>
              <p>✨ You've seen all posts ✨</p>
              <div style={styles.endLine}></div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes expandForm {
          from { opacity: 0; transform: scaleY(0.95); transform-origin: top; }
          to { opacity: 1; transform: scaleY(1); transform-origin: top; }
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    width: '100%',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    overflowX: 'hidden',
  },
  header: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: 'clamp(1.5rem, 5vw, 3rem) clamp(1rem, 4vw, 2rem)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
  },
  headerContent: {
    maxWidth: 'min(1200px, 95%)',
    margin: '0 auto',
  },
  title: {
    fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
    fontWeight: 700,
    margin: '0 0 0.5rem 0',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: 'clamp(0.875rem, 3vw, 1rem)',
    opacity: 0.9,
  },
  content: {
    maxWidth: 'min(1200px, 95%)',
    margin: '-1.5rem auto 0',
    padding: '0 clamp(0.75rem, 3vw, 1rem) clamp(1.5rem, 4vw, 2rem)',
  },
  skeleton: {
    background: 'linear-gradient(90deg, #e0e0e0 0%, #f0f0f0 50%, #e0e0e0 100%)',
    backgroundSize: '1000px 100%',
    animation: 'shimmer 1.5s infinite',
  },
  searchSection: {
    position: 'relative',
    marginBottom: '1.5rem',
  },
  searchWrapper: {
    position: 'relative',
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    transition: 'all 0.3s ease',
  },
  searchIcon: {
    position: 'absolute',
    left: 'clamp(14px, 4vw, 18px)',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#9ca3af',
  },
  searchInput: {
    width: '100%',
    padding: 'clamp(12px, 3.5vw, 14px) clamp(40px, 8vw, 45px) clamp(12px, 3.5vw, 14px) clamp(42px, 8vw, 48px)',
    border: 'none',
    borderRadius: '16px',
    fontSize: 'clamp(14px, 3.5vw, 15px)',
    outline: 'none',
    background: 'transparent',
  },
  clearBtn: {
    position: 'absolute',
    right: 'clamp(10px, 3vw, 14px)',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#9ca3af',
    fontSize: '18px',
    padding: '4px',
    borderRadius: '50%',
  },
  searchResults: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: 0,
    right: 0,
    background: 'white',
    borderRadius: 'clamp(12px, 4vw, 16px)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
    overflow: 'hidden',
    zIndex: 1000,
    animation: 'slideDown 0.2s ease',
    maxHeight: 'min(500px, 70vh)',
  },
  noResults: {
    padding: 'clamp(30px, 10vw, 40px) clamp(16px, 5vw, 20px)',
    textAlign: 'center',
    color: '#6b7280',
  },
  noResultsIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  resultsList: {
    maxHeight: '400px',
    overflowY: 'auto',
  },
  userResult: {
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(10px, 3vw, 12px)',
    padding: 'clamp(12px, 3.5vw, 14px) clamp(16px, 4vw, 20px)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    borderBottom: '1px solid #f3f4f6',
  },
  userAvatar: {
    flexShrink: 0,
  },
  avatarImg: {
    width: 'clamp(40px, 10vw, 48px)',
    height: 'clamp(40px, 10vw, 48px)',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  avatarPlaceholder: {
    width: 'clamp(40px, 10vw, 48px)',
    height: 'clamp(40px, 10vw, 48px)',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'clamp(16px, 4vw, 20px)',
    fontWeight: 600,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '4px',
    fontSize: 'clamp(14px, 3.5vw, 15px)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userEmail: {
    fontSize: 'clamp(12px, 3vw, 13px)',
    color: '#6b7280',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  viewBtn: {
    color: '#9ca3af',
    fontSize: '20px',
    transition: 'all 0.2s ease',
  },
  createPostWrapper: {
    marginBottom: '1.5rem',
  },
  createPostCompact: {
    background: 'white',
    borderRadius: 'clamp(16px, 4vw, 20px)',
    padding: '12px 16px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  compactAvatar: {
    flexShrink: 0,
  },
  compactAvatarPlaceholder: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  compactInput: {
    flex: 1,
  },
  compactPlaceholder: {
    fontSize: '15px',
    color: '#9ca3af',
  },
  compactActions: {
    flexShrink: 0,
  },
  compactMediaBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '20px',
    padding: '8px',
    borderRadius: '50%',
    transition: 'all 0.2s ease',
  },
  createPostExpanded: {
    background: 'white',
    borderRadius: 'clamp(16px, 4vw, 20px)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
    overflow: 'hidden',
    animation: 'expandForm 0.3s ease',
  },
  postsFeed: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  postItem: {
    animation: 'fadeInUp 0.4s ease-out forwards',
    opacity: 0,
  },
  loadingMore: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 0',
    gap: '12px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e5e7eb',
    borderTop: '3px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingMoreText: {
    fontSize: '14px',
    color: '#6b7280',
  },
  endOfFeed: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '32px 0',
  },
  endLine: {
    flex: 1,
    height: '1px',
    background: 'linear-gradient(90deg, transparent, #cbd5e1, transparent)',
  },
  emptyFeed: {
    textAlign: 'center',
    padding: 'clamp(40px, 15vw, 60px) clamp(20px, 5vw, 40px)',
    background: 'white',
    borderRadius: 'clamp(16px, 4vw, 20px)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '20px',
  },
  createFirstBtn: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    textAlign: 'center',
    gap: '1rem',
    background: 'white',
    borderRadius: '20px',
    padding: '48px 24px',
  },
  errorIcon: {
    fontSize: '64px',
  },
  retryBtn: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    cursor: 'pointer',
  },
};

export default FeedPage;