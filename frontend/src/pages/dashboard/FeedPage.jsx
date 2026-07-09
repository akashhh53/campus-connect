import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import debounce from "lodash/debounce";
import { useNavigate } from "react-router";
import {
  FiAlertCircle,
  FiEdit3,
  FiFileText,
  FiRefreshCw,
  FiSearch,
  FiUsers,
  FiX,
} from "react-icons/fi";

import CreatePost from "../../components/feed/CreatePost";
import PostCard from "../../components/feed/PostCard";
import {
  createPost,
  getCachedFeedPosts,
  getFeedPosts,
} from "../../services/feedService";
import { searchUsers } from "../../services/searchService";

const FeedPage = () => {
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const createPostRef = useRef(null);
  const observer = useRef();
  const feedRef = useRef(null);

  const localData = JSON.parse(localStorage.getItem("userInfo") || "null");
  const user = localData?.user;

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

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || "U";

  const fetchPosts = useCallback(
    async (currentPage = 1, append = false, force = false) => {
      const cached =
        currentPage === 1 && !append && !force
          ? getCachedFeedPosts(currentPage)
          : null;

      try {
        if (cached) {
          setPosts(cached.posts || []);
          setHasNext(Boolean(cached.pagination?.hasNext));
          setPage(currentPage);
          setError("");
          setLoading(false);
          setInitialLoading(false);
        } else if (currentPage === 1) {
          setLoading(true);
          setInitialLoading(true);
        } else {
          setLoadingMore(true);
        }

        const data = await getFeedPosts(currentPage, 10, {
          force: force || Boolean(cached),
        });

        setPosts((prev) =>
          append ? [...prev, ...(data.posts || [])] : data.posts || [],
        );
        setHasNext(Boolean(data.pagination?.hasNext));
        setPage(currentPage);
        setError("");
      } catch (err) {
        if (!cached) {
          setError(err.response?.data?.message || "Failed to fetch posts");
        }
      } finally {
        setLoading(false);
        setInitialLoading(false);
        setLoadingMore(false);
      }
    },
    [
      setError,
      setHasNext,
      setInitialLoading,
      setLoading,
      setLoadingMore,
      setPage,
      setPosts,
    ],
  );

  const debouncedSearch = useMemo(
    () =>
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
        } catch (err) {
          console.error("Search error:", err);
          setResults([]);
          setShowSearchResults(true);
        }
      }, 300),
    [setResults, setShowSearchResults],
  );

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      fetchPosts();
    }, 0);

    return () => window.clearTimeout(initialLoad);
  }, [fetchPosts]);

  useEffect(() => {
    return () => debouncedSearch.cancel();
  }, [debouncedSearch]);

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

  const lastPostRef = useCallback(
    (node) => {
      if (loading || loadingMore) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasNext) {
            fetchPosts(page + 1, true);
          }
        },
        { threshold: 0.1, rootMargin: "100px" },
      );

      if (node) observer.current.observe(node);
    },
    [fetchPosts, hasNext, loading, loadingMore, page],
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

  const handleCreatePost = async (postData) => {
    try {
      setCreating(true);
      const newPost = await createPost(postData);
      setPosts((prevPosts) => [newPost.data, ...prevPosts]);
      setShowCreatePost(false);
      feedRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      console.error("Create post error:", err);
      alert(err.response?.data?.message || "Failed to create post");
    } finally {
      setCreating(false);
    }
  };

  const refreshFeed = () => {
    fetchPosts(1, false, true);
  };

  const handleImageClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    return false;
  };

  if (initialLoading) {
    return (
      <main className="feed-page">
        <section className="feed-hero is-loading">
          <div className="feed-skeleton feed-skeleton-title" />
          <div className="feed-skeleton feed-skeleton-line" />
        </section>
        <section className="feed-content">
          <div className="feed-skeleton feed-skeleton-input" />
          <div className="feed-skeleton feed-skeleton-composer" />
          {[1, 2, 3].map((item) => (
            <div className="feed-skeleton feed-skeleton-card" key={item} />
          ))}
        </section>
      </main>
    );
  }

  if (error && posts.length === 0) {
    return (
      <main className="feed-page">
        <section className="feed-hero">
          <div>
            <span className="cc-eyebrow">Campus Feed</span>
            <h1>Something got in the way.</h1>
            <p>We could not load your campus updates right now.</p>
          </div>
        </section>

        <section className="feed-content">
          <div className="feed-state-card">
            <FiAlertCircle />
            <h2>Unable to load feed</h2>
            <p>{error}</p>
            <button className="cc-button" onClick={refreshFeed} type="button">
              <FiRefreshCw />
              Try again
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="feed-page" ref={feedRef}>
      <section className="feed-hero">
        <div>
          <span className="cc-eyebrow">Campus Feed</span>
          <h1>Stay connected with what is happening on campus.</h1>
          <p>
            Share updates, discover classmates, and keep important campus
            conversations in one calm, focused stream.
          </p>
        </div>
      </section>

      <section className="feed-content">
        <div className="feed-toolbar">
          <div className="feed-search" ref={searchRef}>
            <FiSearch className="feed-search-icon" />
            <input
              aria-label="Search students"
              onChange={(event) => handleSearch(event.target.value)}
              placeholder="Search students by name or email"
              ref={searchInputRef}
              type="text"
              value={search}
            />
            {search && (
              <button
                aria-label="Clear search"
                className="feed-clear-search"
                onClick={clearSearch}
                type="button"
              >
                <FiX />
              </button>
            )}

            {showSearchResults && search && (
              <div className="feed-search-results">
                {results.length === 0 ? (
                  <div className="feed-search-empty">
                    <FiUsers />
                    <strong>No students found</strong>
                    <span>Try another name or email.</span>
                  </div>
                ) : (
                  results.map((result) => (
                    <button
                      className="feed-user-result"
                      key={result._id}
                      onClick={() => navigate(`/dashboard/user/${result._id}`)}
                      type="button"
                    >
                      {result.profilePicture ? (
                        <img alt={result.name} src={result.profilePicture} />
                      ) : (
                        <span>{result.name?.charAt(0).toUpperCase() || "U"}</span>
                      )}
                      <span>
                        <strong>{result.name}</strong>
                        <small>{result.email}</small>
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <button className="cc-button cc-button-secondary" onClick={refreshFeed} type="button">
            <FiRefreshCw />
            Refresh feed
          </button>
        </div>

        <div className="feed-composer" ref={createPostRef}>
          {!showCreatePost ? (
            <button
              className="feed-composer-compact"
              onClick={() => setShowCreatePost(true)}
              type="button"
            >
              <span className="feed-composer-avatar">{userInitial}</span>
              <span className="feed-composer-copy">
                <strong>Start a campus update</strong>
                <small>Ask a question, share a note, or post an announcement.</small>
              </span>
              <span className="feed-composer-action">
                <FiEdit3 />
                <span>Post</span>
              </span>
            </button>
          ) : (
            <CreatePost
              creating={creating}
              onCancel={() => setShowCreatePost(false)}
              onCreatePost={handleCreatePost}
            />
          )}
        </div>

        <div className="feed-list">
          {posts.length === 0 ? (
            <div className="feed-state-card">
              <FiFileText />
              <h2>No posts yet</h2>
              <p>Start the first conversation for your campus community.</p>
              <button
                className="cc-button"
                onClick={() => setShowCreatePost(true)}
                type="button"
              >
                <FiEdit3 />
                Create first post
              </button>
            </div>
          ) : (
            posts.map((post, index) => (
              <article
                className="feed-post-shell"
                key={post._id}
                ref={index === posts.length - 1 ? lastPostRef : null}
              >
                <div id={`post-${post._id}`}>
                  <PostCard post={post} onImageClick={handleImageClick} />
                </div>
              </article>
            ))
          )}

          {loadingMore && (
            <div className="feed-loading-more">
              <span className="feed-spinner" />
              Loading more posts...
            </div>
          )}

          {!hasNext && posts.length > 0 && (
            <div className="feed-end">
              <span />
              <p>You have seen all posts.</p>
              <span />
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default FeedPage;
