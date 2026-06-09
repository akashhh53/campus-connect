import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom"; // Add this import
import { getSavedPosts } from "../../services/profileService";
import PostCard from "../../components/feed/PostCard";

const SavedPostsPage = () => {
  const navigate = useNavigate(); // Add this hook
  const [posts, setPosts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const observer = useRef();
  const loaderRef = useRef();

  // FETCH SAVED POSTS with Pagination
  const fetchSaved = async (currentPage = 1, append = false) => {
    try {
      if (currentPage === 1) {
        setLoading(true);
        setInitialLoading(true);
      } else {
        setLoadingMore(true);
      }

      const data = await getSavedPosts(currentPage);
      console.log("Fetched data:", data);

      const newPosts = data.posts || [];
      
      setPosts((prev) => 
        append ? [...prev, ...newPosts] : newPosts
      );
      
      // Store total count from pagination
      if (data.pagination?.totalItems) {
        setTotalCount(data.pagination.totalItems);
      }
      
      setHasNext(data.pagination?.hasNext || false);
      setPage(currentPage);
      
    } catch (error) {
      console.log("Error fetching saved posts:", error);
    } finally {
      setLoading(false);
      setInitialLoading(false);
      setLoadingMore(false);
    }
  };

  // 🔥 FIXED: Infinite scroll observer for ALL layouts
  const lastPostRef = useCallback(
    (node) => {
      if (loading || loadingMore) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasNext) {
            console.log("Loading more posts...");
            fetchSaved(page + 1, true);
          }
        },
        { threshold: 0.1, rootMargin: "100px" }
      );

      if (node) observer.current.observe(node);
    },
    [loading, loadingMore, hasNext, page]
  );

  // Load on page open
  useEffect(() => {
    fetchSaved(1, false);
  }, []);

  const handleImageClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleUnsave = (postId) => {
    setPosts((prev) => prev.filter((item) => item._id !== postId));
    setTotalCount((prev) => prev - 1);
  };

  // Navigate to feed
  const handleExploreFeed = () => {
    navigate('/dashboard/feed'); // Use React Router navigation
  };

  // Split posts into columns for masonry layout
  const getMasonryColumns = () => {
    if (viewMode !== "masonry") return [];
    
    const columns = [[], [], []];
    posts.forEach((post, index) => {
      const columnIndex = index % 3;
      columns[columnIndex].push(post);
    });
    return columns;
  };

  // If still loading, show skeleton
  if (initialLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.headerLeft}>
              <div style={styles.iconWrapper}>
                <svg style={styles.bookmarkIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
              <div>
                <div style={styles.skeletonTitle}></div>
                <div style={styles.skeletonSubtitle}></div>
              </div>
            </div>
            <div style={styles.viewToggle}>
              <div style={styles.skeletonToggle}></div>
            </div>
          </div>
        </div>
        <div style={styles.mainContent}>
          <div style={styles.skeletonStatsBar}></div>
          <div style={styles.skeletonList}>
            <div style={styles.skeletonListItem}></div>
            <div style={styles.skeletonListItem}></div>
            <div style={styles.skeletonListItem}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <div style={styles.iconWrapper}>
              <svg style={styles.bookmarkIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <div>
              <h1 style={styles.title}>Saved Posts</h1>
              <p style={styles.subtitle}>Your curated collection of bookmarked content</p>
            </div>
          </div>

          {/* View Toggle */}
          <div style={styles.viewToggle}>
            <button
              onClick={() => setViewMode("masonry")}
              style={{
                ...styles.toggleButton,
                ...(viewMode === "masonry" ? styles.toggleButtonActive : styles.toggleButtonInactive)
              }}
              className="toggle-button"
            >
              <svg style={styles.toggleIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
              </svg>
              Masonry
            </button>
            <button
              onClick={() => setViewMode("grid")}
              style={{
                ...styles.toggleButton,
                ...(viewMode === "grid" ? styles.toggleButtonActive : styles.toggleButtonInactive)
              }}
              className="toggle-button"
            >
              <svg style={styles.toggleIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              style={{
                ...styles.toggleButton,
                ...(viewMode === "list" ? styles.toggleButtonActive : styles.toggleButtonInactive)
              }}
              className="toggle-button"
            >
              <svg style={styles.toggleIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              List
            </button>
          </div>
        </div>
      </div>

      <div style={styles.mainContent}>
        {posts.length === 0 && !loadingMore ? (
          <div style={styles.emptyContainer}>
            <div style={styles.emptyIconWrapper}>
              <svg style={styles.emptyIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <h3 style={styles.emptyTitle}>No saved posts yet</h3>
            <p style={styles.emptyText}>
              Start saving posts you love by clicking the bookmark icon on any post
            </p>
            <button 
              style={styles.emptyButton}
              className="empty-button"
              onClick={handleExploreFeed} // Updated to use navigate
            >
              Explore Feed
            </button>
          </div>
        ) : (
          <>
            {/* Stats Bar - Shows total count */}
            <div style={styles.statsBar}>
              <div style={styles.statsText}>
                <span style={styles.statsCount}>{totalCount || posts.length}</span> saved {totalCount === 1 ? 'post' : 'posts'}
              </div>
              <div style={styles.statsBadge}>
                <span>✨ Your personal collection</span>
              </div>
            </div>

            {/* Masonry Layout with infinite scroll */}
            {viewMode === "masonry" && (
              <div style={styles.masonryContainer}>
                {getMasonryColumns().map((column, colIndex) => (
                  <div key={colIndex} style={styles.masonryColumn}>
                    {column.map((post, idx) => {
                      const isLastInColumn = colIndex === getMasonryColumns().length - 1 && 
                                             idx === column.length - 1;
                      const isLastPost = colIndex === 2 && idx === column.length - 1;
                      
                      return (
                        <div 
                          key={post._id} 
                          ref={isLastPost ? lastPostRef : null}
                          style={{
                            ...styles.masonryItem,
                            animationDelay: `${(colIndex * 10 + idx) * 0.03}s`
                          }}
                          className="masonry-item"
                        >
                          <PostCard
                            post={{
                              ...post,
                              isSaved: true,
                            }}
                            onImageClick={handleImageClick}
                            onUnsave={handleUnsave}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {/* Grid Layout with infinite scroll */}
            {viewMode === "grid" && (
              <div style={styles.gridView}>
                {posts.map((post, index) => (
                  <div 
                    key={post._id}
                    ref={index === posts.length - 1 ? lastPostRef : null}
                    style={{
                      ...styles.gridItem,
                      animationDelay: `${index * 0.05}s`
                    }}
                    className="grid-item"
                  >
                    <div style={styles.gridCardWrapper}>
                      <PostCard
                        post={{
                          ...post,
                          isSaved: true,
                        }}
                        onImageClick={handleImageClick}
                        onUnsave={handleUnsave}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* List Layout with infinite scroll */}
            {viewMode === "list" && (
              <div style={styles.listView}>
                {posts.map((post, index) => (
                  <div 
                    key={post._id}
                    ref={index === posts.length - 1 ? lastPostRef : null}
                    style={{
                      ...styles.listItem,
                      animationDelay: `${index * 0.05}s`
                    }}
                    className="list-item"
                  >
                    <PostCard
                      post={{
                        ...post,
                        isSaved: true,
                      }}
                      onImageClick={handleImageClick}
                      onUnsave={handleUnsave}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Loading More Indicator */}
            {loadingMore && (
              <div style={styles.loadMoreWrapper}>
                <div style={styles.loadMoreSpinner}></div>
                <p style={styles.loadMoreText}>Loading more saved posts...</p>
              </div>
            )}

            {/* End of Feed */}
            {!hasNext && posts.length > 0 && !loadingMore && (
              <div style={styles.endOfFeed}>
                <div style={styles.endLine}></div>
                <p style={styles.endText}>✨ You've seen all {totalCount} saved posts ✨</p>
                <div style={styles.endLine}></div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ... rest of the styles remain the same ...

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  },
  
  // Skeleton Styles
  skeletonTitle: {
    width: '200px',
    height: '32px',
    background: 'linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: '8px',
    marginBottom: '8px',
  },
  skeletonSubtitle: {
    width: '280px',
    height: '16px',
    background: 'linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: '4px',
  },
  skeletonToggle: {
    width: '200px',
    height: '40px',
    background: 'linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: '12px',
  },
  skeletonStatsBar: {
    height: '48px',
    background: 'linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: '12px',
    marginBottom: '24px',
  },
  skeletonList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  skeletonListItem: {
    height: '200px',
    background: 'linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: '16px',
  },
  
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px 24px',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconWrapper: {
    padding: '10px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarkIcon: {
    width: '24px',
    height: '24px',
    color: 'white',
  },
  title: {
    fontSize: 'clamp(24px, 5vw, 32px)',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: '4px 0 0 0',
  },
  
  viewToggle: {
    display: 'flex',
    gap: '8px',
    background: '#f0f0f0',
    padding: '4px',
    borderRadius: '12px',
  },
  toggleButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s ease',
  },
  toggleButtonActive: {
    background: 'white',
    color: '#667eea',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  toggleButtonInactive: {
    background: 'transparent',
    color: '#666',
  },
  toggleIcon: {
    width: '16px',
    height: '16px',
  },
  
  mainContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '32px 24px',
  },
  
  statsBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '24px',
    padding: '12px 16px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  statsText: {
    fontSize: '14px',
    color: '#666',
  },
  statsCount: {
    fontWeight: 'bold',
    color: '#333',
    fontSize: '16px',
  },
  statsBadge: {
    fontSize: '13px',
    color: '#667eea',
    background: '#f0f0ff',
    padding: '4px 12px',
    borderRadius: '20px',
  },
  
  // MASONRY LAYOUT
  masonryContainer: {
    display: 'flex',
    gap: '24px',
    width: '100%',
  },
  masonryColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  masonryItem: {
    width: '100%',
    animation: 'fadeInUp 0.4s ease-out forwards',
    opacity: 0,
  },
  
  // GRID LAYOUT
  gridView: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '24px',
  },
  gridItem: {
    animation: 'fadeInUp 0.4s ease-out forwards',
    opacity: 0,
  },
  gridCardWrapper: {
    height: '100%',
    display: 'flex',
  },
  
  // LIST LAYOUT
  listView: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  listItem: {
    width: '100%',
    animation: 'fadeInUp 0.4s ease-out forwards',
    opacity: 0,
  },
  
  // Loading More
  loadMoreWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    gap: '16px',
  },
  loadMoreSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e5e7eb',
    borderTop: '3px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadMoreText: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
  },
  
  // End of Feed
  endOfFeed: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '40px 20px',
  },
  endLine: {
    flex: 1,
    height: '1px',
    background: 'linear-gradient(90deg, transparent, #cbd5e1, transparent)',
  },
  endText: {
    fontSize: '14px',
    color: '#6b7280',
    whiteSpace: 'nowrap',
  },
  
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    textAlign: 'center',
    padding: '48px 24px',
  },
  emptyIconWrapper: {
    background: 'white',
    borderRadius: '50%',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  emptyIcon: {
    width: '64px',
    height: '64px',
    color: '#ccc',
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '8px',
  },
  emptyText: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '24px',
    maxWidth: '400px',
  },
  emptyButton: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
};

const addStyles = () => {
  if (typeof document !== 'undefined') {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      .toggle-button:hover {
        transform: translateY(-1px);
        cursor: pointer;
      }
      
      .empty-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }
      
      .masonry-item, .grid-item, .list-item {
        animation: fadeInUp 0.4s ease-out forwards;
      }
      
      @media (max-width: 1024px) {
        .masonry-container {
          gap: 16px !important;
        }
        .masonry-column {
          gap: 16px !important;
        }
      }
      
      @media (max-width: 768px) {
        .header-content {
          padding: 16px !important;
        }
        
        .main-content {
          padding: 20px 16px !important;
        }
        
        .masonry-container {
          flex-direction: column !important;
        }
        
        .grid-view {
          grid-template-columns: 1fr !important;
          gap: 16px !important;
        }
      }
      
      @media (max-width: 480px) {
        .header-left {
          width: 100%;
        }
        
        .view-toggle {
          width: 100%;
          justify-content: center;
        }
        
        .stats-bar {
          flex-direction: column;
          text-align: center;
        }
      }
    `;
    document.head.appendChild(styleSheet);
  }
};

if (typeof window !== 'undefined') {
  addStyles();
}

export default SavedPostsPage;