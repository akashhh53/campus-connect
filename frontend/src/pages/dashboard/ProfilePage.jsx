import { useEffect, useState, useCallback, memo, useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import {
  getMyPosts,
  getSavedPostsCount,
} from "../../services/profileService";
import { getFollowers, getFollowing } from "../../services/userService";
import { followUser, unfollowUser } from "../../services/followService";
import PostCard from "../../components/feed/PostCard";
import EditProfileModal from "../../components/profile/EditProfileModal";

const ProfilePage = memo(() => {
  const navigate = useNavigate();
  const reduxUser = useSelector((state) => state.auth.user);
  const localData = useMemo(
    () => JSON.parse(localStorage.getItem("userInfo") || "null"),
    [],
  );

  const user = useMemo(
    () => ({
      ...(reduxUser || {}),
      ...(localData?.user || {}),
    }),
    [localData?.user, reduxUser],
  );

  const userId = user?._id;

  // Post pagination states
  const [posts, setPosts] = useState([]);
  const [postsPage, setPostsPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [totalPosts, setTotalPosts] = useState(0);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  
  // Followers pagination states
  const [followersList, setFollowersList] = useState([]);
  const [followersPage, setFollowersPage] = useState(1);
  const [hasMoreFollowers, setHasMoreFollowers] = useState(true);
  const [totalFollowers, setTotalFollowers] = useState(0);
  const [loadingMoreFollowers, setLoadingMoreFollowers] = useState(false);
  
  // Following pagination states
  const [followingList, setFollowingList] = useState([]);
  const [followingPage, setFollowingPage] = useState(1);
  const [hasMoreFollowing, setHasMoreFollowing] = useState(true);
  const [totalFollowing, setTotalFollowing] = useState(0);
  const [loadingMoreFollowing, setLoadingMoreFollowing] = useState(false);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersSearch, setFollowersSearch] = useState("");
  const [followingSearch, setFollowingSearch] = useState("");
  const [modalFollowing, setModalFollowing] = useState({});
  const [savedCount, setSavedCount] = useState(0);

  // Refs for infinite scroll
  const postsObserverRef = useRef();
  const followersObserverRef = useRef();
  const followingObserverRef = useRef();

  // Fetch posts with pagination
  const fetchMyPosts = useCallback(async (page = 1, append = false) => {
    try {
      if (page === 1) {
        setLoadingPosts(true);
      } else {
        setLoadingMorePosts(true);
      }

      const response = await getMyPosts(page, 10);
      const newPosts = response.posts || [];
      const pagination = response.pagination || {};
      
      setPosts(prev => append ? [...prev, ...newPosts] : newPosts);
      setHasMorePosts(pagination.hasNext || false);
      setTotalPosts(pagination.total || newPosts.length);
      setPostsPage(page);

      if (page === 1) {
        const savedData = await getSavedPostsCount();
        setSavedCount(savedData.count || 0);
      }
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setLoadingPosts(false);
      setLoadingMorePosts(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch followers with pagination
  const fetchUserFollowers = useCallback(async (page = 1, append = false) => {
    try {
      if (page > 1) {
        setLoadingMoreFollowers(true);
      }

      const followersData = await getFollowers(userId, page, 20);
      const newFollowers = followersData.followers || [];
      const pagination = followersData.pagination || {};
      
      setFollowersList(prev => append ? [...prev, ...newFollowers] : newFollowers);
      setHasMoreFollowers(pagination.hasNext || false);
      setTotalFollowers(pagination.total || newFollowers.length);
      setFollowersPage(page);
      
    } catch (error) {
      console.error("Failed to fetch followers:", error);
    } finally {
      setLoadingMoreFollowers(false);
    }
  }, [userId]);

  // Fetch following with pagination
  const fetchUserFollowing = useCallback(async (page = 1, append = false) => {
    try {
      if (page > 1) {
        setLoadingMoreFollowing(true);
      }

      const followingData = await getFollowing(userId, page, 20);
      const newFollowing = followingData.following || [];
      const pagination = followingData.pagination || {};
      
      setFollowingList(prev => append ? [...prev, ...newFollowing] : newFollowing);
      setHasMoreFollowing(pagination.hasNext || false);
      setTotalFollowing(pagination.total || newFollowing.length);
      setFollowingPage(page);
      
      const followingStatus = {};
      newFollowing.forEach((item) => {
        const userId = item?.following?._id || item?._id;
        if (userId) {
          followingStatus[userId] = true;
        }
      });
      setModalFollowing((prev) => ({
        ...prev,
        ...followingStatus,
      }));
      
    } catch (error) {
      console.error("Failed to fetch following:", error);
    } finally {
      setLoadingMoreFollowing(false);
    }
  }, [userId]);

  // Infinite scroll observer for posts
  const lastPostElementRef = useCallback((node) => {
    if (loadingPosts || loadingMorePosts) return;
    if (postsObserverRef.current) postsObserverRef.current.disconnect();

    postsObserverRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMorePosts) {
          fetchMyPosts(postsPage + 1, true);
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    if (node) postsObserverRef.current.observe(node);
  }, [loadingPosts, loadingMorePosts, hasMorePosts, postsPage, fetchMyPosts]);

  // Infinite scroll observer for followers
  const lastFollowerElementRef = useCallback((node) => {
    if (loadingMoreFollowers) return;
    if (followersObserverRef.current) followersObserverRef.current.disconnect();

    followersObserverRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreFollowers && !followersSearch) {
          fetchUserFollowers(followersPage + 1, true);
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    if (node) followersObserverRef.current.observe(node);
  }, [loadingMoreFollowers, hasMoreFollowers, followersPage, fetchUserFollowers, followersSearch]);

  // Infinite scroll observer for following
  const lastFollowingElementRef = useCallback((node) => {
    if (loadingMoreFollowing) return;
    if (followingObserverRef.current) followingObserverRef.current.disconnect();

    followingObserverRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreFollowing && !followingSearch) {
          fetchUserFollowing(followingPage + 1, true);
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    if (node) followingObserverRef.current.observe(node);
  }, [loadingMoreFollowing, hasMoreFollowing, followingPage, fetchUserFollowing, followingSearch]);

  const handleRefresh = () => {
    setRefreshing(true);
    setPostsPage(1);
    setHasMorePosts(true);
    fetchMyPosts(1, false);
    fetchUserFollowers(1, false);
    fetchUserFollowing(1, false);
  };

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      fetchMyPosts(1, false);

      if (userId) {
        fetchUserFollowers(1, false);
        fetchUserFollowing(1, false);
      }
    }, 0);

    return () => window.clearTimeout(initialLoad);
  }, [fetchMyPosts, fetchUserFollowers, fetchUserFollowing, userId]);

  const stats = {
    posts: totalPosts,
    followers: totalFollowers,
    following: totalFollowing,
  };

  const filteredFollowers = followersList.filter((item) =>
    (item?.follower?.name || "")
      .toLowerCase()
      .includes(followersSearch.toLowerCase()),
  );

  const filteredFollowing = followingList.filter((item) =>
    (item?.following?.name || "")
      .toLowerCase()
      .includes(followingSearch.toLowerCase()),
  );

  const handleImageClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  const handleUserClick = (userId) => {
    if (!userId) return;

    if (userId === user?._id) {
      navigate("/dashboard/profile");
    } else {
      navigate(`/dashboard/user/${userId}`);
    }

    setShowFollowersModal(false);
    setShowFollowingModal(false);
  };

  const handleModalFollow = async (targetUserId) => {
    if (!targetUserId) return;

    const currentlyFollowing = modalFollowing[targetUserId];

    try {
      if (currentlyFollowing) {
        await unfollowUser(targetUserId);
        setTotalFollowing((prev) => Math.max(0, prev - 1));
        setModalFollowing((prev) => ({
          ...prev,
          [targetUserId]: false,
        }));
      } else {
        await followUser(targetUserId);
        setTotalFollowing((prev) => prev + 1);
        setModalFollowing((prev) => ({
          ...prev,
          [targetUserId]: true,
        }));
      }
    } catch (error) {
      console.log(error);
      alert(error?.response?.data?.message || "Failed");
    }
  };

  const handleCloseFollowersModal = () => {
    setShowFollowersModal(false);
    setFollowersSearch("");
  };

  const handleCloseFollowingModal = () => {
    setShowFollowingModal(false);
    setFollowingSearch("");
  };

  return (
    <div className="profile-container">
      {/* Cover Image with Gradient */}
      <div className="cover-container">
        <div className="cover-gradient">
          <div className="cover-pattern"></div>
        </div>
      </div>

      {/* Profile Section */}
      <div className="profile-wrapper">
        <div className="avatar-container">
          <div className="avatar-frame">
            <img
              src={
                user?.profilePicture ||
                `https://ui-avatars.com/api/?name=${user?.name || "User"}&background=667eea&color=fff&size=120&bold=true`
              }
              alt={user?.name || "Profile"}
              className="avatar"
              draggable="false"
            />
          </div>
        </div>

        <div className="profile-card">
          <div className="profile-header">
            <div className="name-section">
              <h1 className="name">{user?.name || "Anonymous User"}</h1>
              <button
                onClick={() => setShowEditModal(true)}
                className="edit-button"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"></path>
                  <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon>
                </svg>
                Edit Profile
              </button>
            </div>

            <p className="email">{user?.email}</p>

            <div className="role-container">
              <span className="role-badge">
                <span className="role-dot"></span>
                {user?.role?.name || "Student"}
              </span>
            </div>
          </div>

          {/* Stats Section */}
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-number">{stats.posts}</span>
              <span className="stat-label">Posts</span>
            </div>

            <div className="stat-divider" />

            <div
              className="stat-card"
              onClick={() => navigate("/dashboard/saved")}
              style={{ cursor: "pointer" }}
            >
              <span className="stat-number">{savedCount}</span>
              <span className="stat-label">Saved</span>
            </div>

            <div className="stat-divider" />

            <div
              className="stat-card"
              onClick={() => {
                setFollowersSearch("");
                setShowFollowersModal(true);
              }}
              style={{ cursor: "pointer" }}
            >
              <span className="stat-number">{stats.followers}</span>
              <span className="stat-label">Followers</span>
            </div>

            <div className="stat-divider" />

            <div
              className="stat-card"
              onClick={() => {
                setFollowingSearch("");
                setShowFollowingModal(true);
              }}
              style={{ cursor: "pointer" }}
            >
              <span className="stat-number">{stats.following}</span>
              <span className="stat-label">Following</span>
            </div>
          </div>

          {/* Bio Section */}
          <div className="bio-section">
            <div className="bio-header">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <h3 className="bio-title">About</h3>
            </div>
            <p className="bio-text">{user?.bio || "No bio added yet"}</p>
          </div>
        </div>
      </div>

      {/* Posts Section */}
      <div className="posts-section">
        <div className="posts-header">
          <div className="posts-title-wrapper">
            <div className="posts-icon-wrapper">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <h2 className="posts-title">My Posts</h2>
            <span className="posts-count">{totalPosts}</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`refresh-button ${refreshing ? "refreshing" : ""}`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>

        {loadingPosts && posts.length === 0 ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading your posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-container">
            <div className="empty-icon-wrapper">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <h3 className="empty-title">No posts yet</h3>
            <p className="empty-text">
              Share your first post with the community!
            </p>
          </div>
        ) : (
          <div className="posts-list">
            {posts.map((post, index) => (
              <div
                key={post._id}
                ref={index === posts.length - 1 ? lastPostElementRef : null}
              >
                <PostCard
                  post={post}
                  onImageClick={handleImageClick}
                />
              </div>
            ))}
            
            {loadingMorePosts && (
              <div className="loading-more-container">
                <div className="loading-spinner-small"></div>
                <p className="loading-more-text">Loading more posts...</p>
              </div>
            )}
            
            {!hasMorePosts && posts.length > 0 && (
              <div className="end-of-posts">
                <div className="end-line"></div>
                <p className="end-text">✨ You've seen all {totalPosts} posts ✨</p>
                <div className="end-line"></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditProfileModal
          user={user}
          onClose={() => setShowEditModal(false)}
          onUpdate={() => {
            fetchMyPosts(1, false);
            fetchUserFollowers(1, false);
            fetchUserFollowing(1, false);
          }}
        />
      )}

      {/* Followers Modal with Pagination */}
      {showFollowersModal && (
        <div className="modal-overlay" onClick={handleCloseFollowersModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Followers ({totalFollowers})</h3>
              <button onClick={handleCloseFollowersModal}>✕</button>
            </div>

            <div className="modal-search">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder="Search followers..."
                value={followersSearch}
                onChange={(e) => setFollowersSearch(e.target.value)}
                className="search-input"
              />
              {followersSearch && (
                <button
                  onClick={() => setFollowersSearch("")}
                  className="search-clear"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="modal-list">
              {filteredFollowers.length === 0 ? (
                <p className="modal-empty">
                  {followersSearch
                    ? "No matching followers found"
                    : "No followers yet"}
                </p>
              ) : (
                <>
                  {filteredFollowers.map((item, index) => {
                    const userId = item?.follower?._id || item?._id;
                    const isCurrentUser = userId === user?._id;
                    const isFollowing = modalFollowing[userId];
                    const isLastItem = index === filteredFollowers.length - 1;

                    return (
                      <div
                        key={item._id}
                        ref={isLastItem && !followersSearch ? lastFollowerElementRef : null}
                        className="user-row"
                        onClick={() => handleUserClick(userId)}
                      >
                        <img
                          src={
                            item?.follower?.profilePicture ||
                            `https://ui-avatars.com/api/?name=${item?.follower?.name || "User"}`
                          }
                          alt={item?.follower?.name || "User"}
                        />
                        <div>
                          <strong>{item?.follower?.name || "Anonymous"}</strong>
                        </div>
                        {isCurrentUser ? (
                          <button className="you-btn">You</button>
                        ) : (
                          <button
                            className={`follow-mini ${isFollowing ? "following" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleModalFollow(userId);
                            }}
                          >
                            {isFollowing ? "Unfollow" : "Follow"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                  
                  {loadingMoreFollowers && (
                    <div className="loading-more-modal">
                      <div className="loading-spinner-small"></div>
                    </div>
                  )}
                  
                  {!hasMoreFollowers && !loadingMoreFollowers && !followersSearch && filteredFollowers.length > 0 && (
                    <div className="end-of-modal">
                      <p style={{ textAlign: "center", margin: 0 }}>✨ No more followers ✨</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Following Modal with Pagination */}
      {showFollowingModal && (
        <div className="modal-overlay" onClick={handleCloseFollowingModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Following ({totalFollowing})</h3>
              <button onClick={handleCloseFollowingModal}>✕</button>
            </div>

            <div className="modal-search">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search following..."
                value={followingSearch}
                onChange={(e) => setFollowingSearch(e.target.value)}
                className="search-input"
              />
              {followingSearch && (
                <button
                  onClick={() => setFollowingSearch("")}
                  className="search-clear"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="modal-list">
              {filteredFollowing.length === 0 ? (
                <p className="modal-empty">
                  {followingSearch
                    ? "No matching users found"
                    : "Not following anyone yet"}
                </p>
              ) : (
                <>
                  {filteredFollowing.map((item, index) => {
                    const userId = item?.following?._id || item?._id;
                    const isCurrentUser = userId === user?._id;
                    const isFollowing = modalFollowing[userId];
                    const isLastItem = index === filteredFollowing.length - 1;

                    return (
                      <div
                        key={item._id}
                        ref={isLastItem && !followingSearch ? lastFollowingElementRef : null}
                        className="user-row"
                        onClick={() => handleUserClick(userId)}
                      >
                        <img
                          src={
                            item?.following?.profilePicture ||
                            `https://ui-avatars.com/api/?name=${item?.following?.name || "User"}`
                          }
                          alt={item?.following?.name || "User"}
                        />
                        <div>
                          <strong>{item?.following?.name || "Anonymous"}</strong>
                        </div>
                        {isCurrentUser ? (
                          <button className="you-btn">You</button>
                        ) : (
                          <button
                            className={`follow-mini ${isFollowing ? "following" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleModalFollow(userId);
                            }}
                          >
                            {isFollowing ? "Unfollow" : "Follow"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                  
                  {loadingMoreFollowing && (
                    <div className="loading-more-modal">
                      <div className="loading-spinner-small"></div>
                    </div>
                  )}
                  
                  {!hasMoreFollowing && !loadingMoreFollowing && !followingSearch && filteredFollowing.length > 0 && (
                    <div className="end-of-modal">
                      <p style={{ textAlign: "center", margin: 0 }}>✨ No more following ✨</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .profile-container {
          width: min(var(--cc-page-max), calc(100% - var(--cc-page-gutter)));
          margin: 0 auto;
          min-height: 100vh;
          padding: 24px 0 48px;
          position: relative;
          color: var(--cc-text);
        }

        .cover-container {
          height: clamp(130px, 16vw, 190px);
          width: 100%;
          overflow: hidden;
          position: relative;
          border: 1px solid rgba(15, 118, 110, 0.16);
          border-radius: var(--cc-radius);
          box-shadow: var(--cc-shadow-soft);
        }

        .cover-gradient {
          height: 100%;
          width: 100%;
          background:
            radial-gradient(circle at 85% 12%, rgba(255, 255, 255, 0.24), transparent 17rem),
            radial-gradient(circle at 14% 82%, rgba(255, 255, 255, 0.14), transparent 18rem),
            linear-gradient(135deg, var(--cc-primary), var(--cc-accent));
          position: relative;
        }

        .cover-pattern {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: radial-gradient(
            circle at 25% 40%,
            rgba(255, 255, 255, 0.1) 2%,
            transparent 2.5%
          );
          background-size: 30px 30px;
          opacity: 0.5;
        }

        .profile-wrapper {
          width: 100%;
          margin: 0 auto;
          padding: 0;
          position: relative;
          z-index: 2;
        }

        .avatar-container {
          display: flex;
          justify-content: center;
          margin-top: clamp(-44px, -6vw, -54px);
          margin-bottom: clamp(12px, 3vw, 16px);
          position: relative;
          z-index: 3;
        }

        .avatar-frame {
          padding: 4px;
          background: var(--cc-surface);
          border: 1px solid var(--cc-border);
          border-radius: 50%;
          box-shadow: var(--cc-shadow-soft);
          transition: transform 0.3s ease;
        }

        .avatar-frame:hover {
          transform: scale(1.02);
        }

        .avatar {
          width: clamp(92px, 12vw, 112px);
          height: clamp(92px, 12vw, 112px);
          border-radius: 50%;
          object-fit: cover;
          display: block;
          pointer-events: none;
          user-select: none;
        }

        .profile-card {
          background: var(--cc-surface-raised);
          border: 1px solid var(--cc-border);
          border-radius: var(--cc-radius);
          padding: clamp(22px, 5vw, 34px);
          box-shadow: var(--cc-shadow-soft);
          backdrop-filter: blur(14px);
          transition: all 0.3s ease;
        }

        .profile-card:hover {
          box-shadow: var(--cc-shadow);
        }

        .profile-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .name-section {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }

        .name {
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 850;
          background: linear-gradient(135deg, var(--cc-primary), var(--cc-accent));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          margin: 0;
        }

        .edit-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: var(--cc-surface);
          border: 1px solid var(--cc-border);
          border-radius: var(--cc-radius);
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
          color: var(--cc-muted-strong);
          transition: all 0.2s ease;
        }

        .edit-button:hover {
          background: var(--cc-primary-soft);
          border-color: rgba(15, 118, 110, 0.26);
          color: var(--cc-primary-dark);
          transform: translateY(-1px);
        }

        .email {
          color: var(--cc-muted);
          font-size: clamp(13px, 3.5vw, 14px);
          margin: 8px 0 12px 0;
        }

        .role-container {
          margin-top: 8px;
        }

        .role-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid rgba(15, 118, 110, 0.18);
          background: var(--cc-primary-soft);
          color: var(--cc-primary-dark);
          padding: 5px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 800;
        }

        .role-dot {
          width: 6px;
          height: 6px;
          background: var(--cc-primary);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .stats-grid {
          display: flex;
          align-items: center;
          justify-content: space-evenly;
          gap: clamp(14px, 4vw, 42px);
          padding: 20px;
          border: 1px solid var(--cc-border);
          border-radius: var(--cc-radius);
          background: var(--cc-surface-soft);
          margin-bottom: 24px;
        }

        .stat-card {
          text-align: center;
          transition: transform 0.2s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
        }

        .stat-number {
          display: block;
          font-size: clamp(22px, 5vw, 28px);
          font-weight: 850;
          background: linear-gradient(135deg, var(--cc-primary), var(--cc-accent));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 13px;
          color: var(--cc-muted);
          font-weight: 700;
        }

        .stat-divider {
          width: 1px;
          height: 40px;
          background: var(--cc-border);
        }

        .bio-section {
          text-align: center;
          padding: 18px;
          border: 1px solid var(--cc-border);
          border-radius: var(--cc-radius);
          background: var(--cc-surface);
        }

        .bio-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .bio-header svg {
          color: var(--cc-primary);
        }

        .bio-title {
          font-size: 16px;
          font-weight: 800;
          color: var(--cc-text);
          margin: 0;
        }

        .bio-text {
          font-size: 14px;
          color: var(--cc-muted-strong);
          line-height: 1.6;
          margin: 0;
          max-width: 760px;
          margin: 0 auto;
        }

        .posts-section {
          width: 100%;
          padding: 0 0 40px;
          margin-left: auto;
          margin-right: auto;
          margin-top: 32px;
        }

        .posts-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          margin-bottom: 18px;
          padding: 14px;
          border: 1px solid var(--cc-border);
          border-radius: var(--cc-radius);
          background: var(--cc-surface-raised);
          box-shadow: var(--cc-shadow-soft);
        }

        .posts-title-wrapper {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .posts-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: var(--cc-primary-soft);
          border-radius: var(--cc-radius);
        }

        .posts-icon-wrapper svg {
          color: var(--cc-primary-dark);
        }

        .posts-title {
          font-size: clamp(18px, 4vw, 20px);
          font-weight: 850;
          color: var(--cc-text);
          margin: 0;
        }

        .posts-count {
          background: var(--cc-surface-soft);
          border: 1px solid var(--cc-border);
          padding: 2px 10px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 800;
          color: var(--cc-muted-strong);
        }

        .refresh-button {
          width: 40px;
          height: 40px;
          border-radius: var(--cc-radius);
          border: 1px solid var(--cc-border);
          background: var(--cc-surface);
          color: var(--cc-primary-dark);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(21, 35, 45, 0.045);
        }

        .refresh-button:hover {
          background: var(--cc-primary-soft);
          transform: rotate(180deg);
          box-shadow: var(--cc-shadow-soft);
        }

        .refresh-button.refreshing {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .loading-container {
          text-align: center;
          padding: 60px 20px;
          border: 1px solid var(--cc-border);
          border-radius: var(--cc-radius);
          background: var(--cc-surface-raised);
          box-shadow: var(--cc-shadow-soft);
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 3px solid var(--cc-border);
          border-top-color: var(--cc-primary);
          border-radius: 50%;
          margin: 0 auto 16px;
          animation: spin 0.8s linear infinite;
        }

        .loading-text {
          color: var(--cc-muted);
          font-size: 14px;
        }

        .loading-more-container {
          text-align: center;
          padding: 30px 20px;
        }

        .loading-spinner-small {
          width: 24px;
          height: 24px;
          border: 2px solid var(--cc-border);
          border-top-color: var(--cc-primary);
          border-radius: 50%;
          margin: 0 auto;
          animation: spin 0.6s linear infinite;
        }

        .loading-more-text {
          color: var(--cc-muted);
          font-size: 12px;
          margin-top: 8px;
        }

        .loading-more-modal {
          text-align: center;
          padding: 16px;
        }

        .end-of-posts {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 30px 20px;
        }

        .end-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--cc-border-strong), transparent);
        }

        .end-text {
          font-size: 12px;
          color: var(--cc-muted);
          white-space: nowrap;
        }

        .end-of-modal {
          text-align: center;
          padding: 16px;
          color: var(--cc-muted);
          font-size: 12px;
        }

        .empty-container {
          text-align: center;
          padding: 60px 20px;
          border: 1px solid var(--cc-border);
          border-radius: var(--cc-radius);
          background: var(--cc-surface-raised);
          box-shadow: var(--cc-shadow-soft);
        }

        .empty-icon-wrapper {
          width: 80px;
          height: 80px;
          margin: 0 auto 20px;
          background: var(--cc-primary-soft);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .empty-icon-wrapper svg {
          color: var(--cc-primary);
        }

        .empty-title {
          font-size: 20px;
          font-weight: 850;
          color: var(--cc-text);
          margin-bottom: 8px;
        }

        .empty-text {
          color: var(--cc-muted);
          font-size: 14px;
        }

        .posts-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
        }

        .posts-list img {
          pointer-events: none;
          user-select: none;
          -webkit-user-drag: none;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(2, 6, 23, 0.58);
          backdrop-filter: blur(4px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 999;
        }

        .modal-card {
          background: var(--cc-surface);
          color: var(--cc-text);
          width: min(440px, calc(100% - 32px));
          max-height: min(560px, calc(100vh - 56px));
          overflow: auto;
          border: 1px solid var(--cc-border);
          border-radius: var(--cc-radius);
          padding: 0;
          box-shadow: var(--cc-shadow);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--cc-border);
        }

        .modal-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 850;
          color: var(--cc-text);
        }

        .modal-header button {
          border: none;
          background: none;
          cursor: pointer;
          font-size: 20px;
          color: var(--cc-muted);
          transition: color 0.2s;
          padding: 4px;
        }

        .modal-header button:hover {
          color: var(--cc-text);
        }

        .modal-search {
          position: relative;
          padding: 12px 16px;
          border-bottom: 1px solid var(--cc-border);
        }

        .modal-search svg {
          position: absolute;
          left: 28px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--cc-muted);
        }

        .search-input {
          width: 100%;
          padding: 10px 35px 10px 38px;
          border: 1px solid var(--cc-border);
          border-radius: var(--cc-radius);
          background: var(--cc-surface-soft);
          color: var(--cc-text);
          font-size: 14px;
          outline: none;
          transition: all 0.2s;
        }

        .search-input:focus {
          border-color: var(--cc-primary);
          box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.13);
        }

        .search-clear {
          position: absolute;
          right: 28px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: var(--cc-muted);
          font-size: 14px;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s;
        }

        .search-clear:hover {
          background: var(--cc-surface-soft);
          color: var(--cc-text);
        }

        .modal-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-height: 380px;
          overflow-y: auto;
          padding: 8px 0;
        }

        .user-row {
          display: flex;
          gap: 12px;
          padding: 10px 16px;
          align-items: center;
          border: 1px solid transparent;
          border-radius: var(--cc-radius);
          transition: background 0.2s;
          cursor: pointer;
          margin: 0 8px;
        }

        .user-row:hover {
          border-color: var(--cc-border);
          background: var(--cc-surface-soft);
        }

        .user-row img {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }

        .user-row div {
          flex: 1;
        }

        .user-row strong {
          font-size: 14px;
          font-weight: 800;
          color: var(--cc-text);
        }

        .follow-mini {
          margin-left: auto;
          padding: 5px 12px;
          border: 1px solid transparent;
          border-radius: 999px;
          background: var(--cc-primary);
          color: #ffffff;
          cursor: pointer;
          font-size: 12px;
          font-weight: 750;
          transition: all 0.2s;
        }

        .follow-mini:hover {
          background: var(--cc-primary-dark);
          transform: translateY(-1px);
        }

        .follow-mini.following {
          background: var(--cc-surface-soft);
          color: var(--cc-muted-strong);
          border-color: var(--cc-border);
        }

        .follow-mini.following:hover {
          background: var(--cc-danger-soft);
          color: var(--cc-danger);
          border-color: rgba(220, 38, 38, 0.24);
        }

        .you-btn {
          margin-left: auto;
          padding: 5px 12px;
          border: 1px solid var(--cc-border);
          border-radius: 999px;
          background: var(--cc-surface-soft);
          color: var(--cc-muted-strong);
          font-size: 12px;
          font-weight: 750;
          cursor: default;
        }

        .modal-empty {
          text-align: center;
          padding: 40px 20px;
          color: var(--cc-muted);
          font-size: 14px;
        }

        @media (max-width: 768px) {
          .profile-container {
            width: min(100% - 20px, var(--cc-page-max));
            padding-top: 18px;
          }

          .profile-wrapper,
          .posts-section {
            width: min(100%, var(--cc-page-max));
          }

          .stats-grid {
            gap: 12px;
            overflow-x: auto;
            justify-content: flex-start;
          }

          .stat-divider {
            height: 30px;
          }

          .name-section {
            flex-direction: column;
            gap: 8px;
          }

          .edit-button {
            padding: 5px 14px;
          }

          .modal-card {
            max-width: 400px;
            margin: 20px;
          }
        }

        @media (max-width: 480px) {
          .stats-grid {
            gap: 10px;
            padding: 14px;
          }

          .stat-number {
            font-size: 20px;
          }

          .stat-label {
            font-size: 11px;
          }
        }

        @media (hover: none) and (pointer: coarse) {
          .edit-button:active {
            background: var(--cc-surface-soft);
            transform: scale(0.98);
          }

          .refresh-button:active {
            background: var(--cc-surface-soft);
          }

          .user-row:active {
            background: var(--cc-surface-soft);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .avatar-frame:hover,
          .stat-card:hover,
          .edit-button:hover,
          .refresh-button:hover {
            transform: none;
          }

          .refresh-button:hover {
            transform: none;
          }

          .loading-spinner,
          .loading-spinner-small {
            animation: none;
            border-top-color: var(--cc-primary);
          }
        }
      `}</style>
    </div>
  );
});

ProfilePage.displayName = "ProfilePage";

export default ProfilePage;
