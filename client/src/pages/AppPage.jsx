import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CreateServerModal from '../components/CreateServerModal';
import styles from "./AppPage.module.css";
import UserSettings from "./UserSettings";

const API = "http://localhost:8000/api";

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
}

export default function AppPage() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "User";
  const userId = Number(localStorage.getItem("userId"));

  // ── State ──
  const [servers, setServers] = useState([]);
  const [activeServer, setActiveServer] = useState("home");
  const [serverData, setServerData] = useState(null); // full server details + members
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState("");
  const [isMuted, setIsMuted] = useState(true);
  const [friendInput, setFriendInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [showServerMenu, setShowServerMenu] = useState(false);
  const [toast, setToast] = useState("");

  const chatEndRef = useRef(null);
  const pollRef = useRef(null);

  // ── Fetch user's servers ──
  const fetchServers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/servers/mine`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setServers(data);
      }
    } catch (err) {
      console.error("Failed to fetch servers:", err);
    }
  }, []);

  useEffect(() => { fetchServers(); }, [fetchServers]);

  // ── Fetch full server data when active server changes ──
  useEffect(() => {
    if (activeServer === "home" || !activeServer) {
      setServerData(null);
      setActiveChannel(null);
      setMessages([]);
      setShowServerMenu(false);
      return;
    }

    const fetchServerData = async () => {
      try {
        const res = await fetch(`${API}/servers/${activeServer}`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          setServerData(data);
          // Auto-select first channel if none selected
          if (data.channels.length > 0) {
            setActiveChannel((prev) => {
              const exists = data.channels.find((c) => c.id === prev);
              return exists ? prev : data.channels[0].id;
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch server:", err);
      }
    };

    fetchServerData();
  }, [activeServer]);

  // ── Fetch messages for active channel + poll every 3s ──
  const fetchMessages = useCallback(async () => {
    if (activeServer === "home" || !activeServer || !activeChannel) return;
    try {
      const res = await fetch(
        `${API}/servers/${activeServer}/channels/${activeChannel}/messages`,
        { headers: authHeaders() }
      );
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  }, [activeServer, activeChannel]);

  useEffect(() => {
    fetchMessages();
    // Poll every 3 seconds
    pollRef.current = setInterval(fetchMessages, 3000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  // ── Auto-scroll chat ──
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ──
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!msgInput.trim() || !activeChannel) return;

    try {
      await fetch(
        `${API}/servers/${activeServer}/channels/${activeChannel}/messages`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ content: msgInput }),
        }
      );
      setMsgInput("");
      fetchMessages();
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  // ── Logout ──
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    navigate("/");
  };

  // ── Server created callback ──
  const onServerCreated = () => {
    fetchServers();
  };

  // ── Delete server (owner only) ──
  const handleDeleteServer = async () => {
    if (!serverData || serverData.ownerId !== userId) return;
    if (!window.confirm(`Delete "${serverData.name}"? This cannot be undone.`)) return;

    try {
      await fetch(`${API}/servers/${activeServer}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      setActiveServer("home");
      setShowServerMenu(false);
      fetchServers();
    } catch (err) {
      console.error("Failed to delete server:", err);
    }
  };

  // ── Leave server ──
  const handleLeaveServer = async () => {
    if (!window.confirm(`Leave "${serverData?.name}"?`)) return;

    try {
      await fetch(`${API}/servers/${activeServer}/leave`, {
        method: "POST",
        headers: authHeaders(),
      });
      setActiveServer("home");
      setShowServerMenu(false);
      fetchServers();
    } catch (err) {
      console.error("Failed to leave server:", err);
    }
  };

  // ── Copy invite link ──
  const handleCopyInvite = () => {
    const code = serverData?.inviteCode;
    if (!code) return;
    const link = `${window.location.origin}/invite/${code}`;
    navigator.clipboard.writeText(link);
    setToast("Invite link copied!");
    setShowServerMenu(false);
    setTimeout(() => setToast(""), 2500);
  };

  // ── Server joined callback ──
  const onServerJoined = () => {
    fetchServers();
  };

  const channels = serverData?.channels || [];
  const members = serverData?.membersData || [];
  const currentServer = servers.find((s) => s.id === activeServer);
  const activeChannelName = channels.find((c) => c.id === activeChannel)?.name || "";

  // ── User Info Bar ──
  const UserInfoBar = () => (
    <footer className={styles.userInfo}>
      <div className={styles.userLeft}>
        <div className={styles.avatarWrapper}>
          <div className={styles.userAvatar}>
            {username.charAt(0).toUpperCase()}
          </div>
          <div className={styles.statusIndicator}></div>
        </div>
        <div className={styles.userText}>
          <div className={styles.userName}>{username}</div>
          <div className={styles.userStatus}>Online</div>
        </div>
      </div>

      <div className={styles.userControls}>
        <button
          type="button"
          className={`${styles.userIconBtn} ${isMuted ? styles.userIconBtnDanger : ""}`}
          onClick={() => setIsMuted(!isMuted)}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
          )}
        </button>
        <button type="button" className={styles.userIconBtn} title="User Settings" onClick={() => setShowSettings(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        </button>
        <button type="button" className={styles.userIconBtn} title="Log Out" onClick={handleLogout} style={{ color: '#f23f43' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        </button>
      </div>
    </footer>
  );

  return (
    <div className={styles.layout}>
      {/* 1. SERVER BAR */}
      <aside className={styles.serverSidebar}>
        <button
          type="button"
          className={`${styles.serverHome} ${activeServer === "home" ? styles.activeHome : ""}`}
          title="Direct Messages"
          onClick={() => setActiveServer("home")}
        >
          <svg width="28" height="20" viewBox="0 0 28 20" fill="currentColor">
            <path d="M23.0212 1.67671C21.3107 0.879656 19.5079 0.318797 17.6584 0C17.4062 0.461742 17.1749 0.934541 16.9708 1.4184C15.003 1.12145 12.9974 1.12145 11.0283 1.4184C10.819 0.934541 10.589 0.461742 10.3368 0C8.48074 0.318797 6.68449 0.879656 4.97396 1.67671C1.56727 6.77853 0.645842 11.7538 1.11108 16.652C3.10102 18.1418 5.3262 19.2743 7.69177 20C8.22338 19.2743 8.69519 18.4993 9.09812 17.691C8.32996 17.3997 7.58522 17.0424 6.87684 16.6135C7.06531 16.4762 7.24726 16.3387 7.42442 16.1846C11.5911 18.1106 16.408 18.1106 20.5763 16.1846C20.7534 16.3387 20.9354 16.4762 21.1171 16.6135C20.41 17.0369 19.6639 17.3997 18.897 17.691C19.3052 18.4993 19.7718 19.2689 20.3021 20C22.6677 19.2743 24.8929 18.1418 26.8828 16.652C27.43 10.9731 25.9665 6.04728 23.0212 1.67671ZM9.68041 13.6383C8.39754 13.6383 7.34085 12.4453 7.34085 10.994C7.34085 9.54272 8.37155 8.34973 9.68041 8.34973C10.9893 8.34973 12.0395 9.54272 12.0187 10.994C12.0187 12.4453 10.9828 13.6383 9.68041 13.6383ZM18.3161 13.6383C17.0332 13.6383 15.9765 12.4453 15.9765 10.994C15.9765 9.54272 17.0072 8.34973 18.3161 8.34973C19.6249 8.34973 20.6751 9.54272 20.6543 10.994C20.6543 12.4453 19.6249 13.6383 18.3161 13.6383Z" />
          </svg>
        </button>

        <div className={styles.divider} />

        {servers.map((server) => (
          <button
            key={server.id}
            type="button"
            title={server.name}
            className={`${styles.serverIcon} ${activeServer === server.id ? styles.activeServer : ""}`}
            onClick={() => setActiveServer(server.id)}
          >
            {server.name.charAt(0).toUpperCase()}
          </button>
        ))}

        <button
          type="button"
          title="Add a Server"
          className={styles.serverIcon}
          style={{ background: "transparent", border: "1px dashed #35363c" }}
          onClick={() => setIsServerModalOpen(true)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
        </button>
      </aside>

      {/* 2. SECONDARY SIDEBAR */}
      <aside className={styles.secondarySidebar}>
        {activeServer === "home" ? (
          <>
            <div className={styles.searchWrapper}>
              <button className={styles.searchButton}>Find or start a conversation</button>
            </div>
            <div className={styles.scrollSection}>
              <div className={styles.dmNavList}>
                <div className={`${styles.navItem} ${styles.activeNavItem}`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v2h20v-2c0-3.33-6.67-5-10-5z" /></svg>
                  <span>Friends</span>
                </div>
                <div className={styles.navItem}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                  <span>Nitro</span>
                </div>
              </div>
              <div className={styles.dmSectionHeader}>
                <span>Direct Messages</span>
                <button className={styles.addDmBtn}>+</button>
              </div>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className={styles.dmPlaceholder}>
                  <div className={styles.dmAvatarGhost}></div>
                  <div className={styles.dmNameGhost}></div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <header className={styles.serverHeader} onClick={() => setShowServerMenu(!showServerMenu)}>
              <span>{currentServer?.name || serverData?.name || "Server"}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showServerMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
            </header>

            {/* Server dropdown menu */}
            {showServerMenu && (
              <div className={styles.serverDropdown}>
                <button className={styles.dropdownItem} onClick={handleCopyInvite}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                  Invite People
                </button>
                {serverData?.ownerId !== userId && (
                  <button className={`${styles.dropdownItem} ${styles.dropdownDanger}`} onClick={handleLeaveServer}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    Leave Server
                  </button>
                )}
                {serverData?.ownerId === userId && (
                  <button className={`${styles.dropdownItem} ${styles.dropdownDanger}`} onClick={handleDeleteServer}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    Delete Server
                  </button>
                )}
              </div>
            )}
            <section className={styles.scrollSection}>
              <div className={styles.categoryHeader}>
                <span>Text Channels</span>
              </div>
              {channels.map((ch) => (
                <button
                  key={ch.id}
                  className={`${styles.channel} ${activeChannel === ch.id ? styles.activeChannel : ""}`}
                  onClick={() => setActiveChannel(ch.id)}
                >
                  <div className={styles.channelLeft}>
                    <span className={styles.hash}>#</span>
                    {ch.name}
                  </div>
                </button>
              ))}
            </section>
          </>
        )}
        <UserInfoBar />
      </aside>

      {/* 3. MAIN AREA */}
      <main className={styles.mainArea}>
        {activeServer === "home" ? (
          <>
            <header className={styles.topHeader}>
              <div className={styles.headerLeft}>
                <div className={styles.headerTitle}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v2h20v-2c0-3.33-6.67-5-10-5z" /></svg>
                  Friends
                </div>
                <div className={styles.headerDivider}></div>
                <div className={styles.headerTabs}>
                  <button className={styles.tabBtn}>Online</button>
                  <button className={styles.tabBtn}>All</button>
                  <button className={styles.tabBtn}>Pending</button>
                  <button className={`${styles.tabBtn} ${styles.activeTabBtn}`}>Add Friend</button>
                </div>
              </div>
            </header>
            <div className={styles.friendsLayout}>
              <div className={styles.friendsMain}>
                <div className={styles.addFriendSection}>
                  <div className={styles.addFriendHeader}>
                    <div>
                      <h2 className={styles.addFriendTitle}>Add Friend</h2>
                      <p className={styles.addFriendDesc}>You can add friends with their LinkSphere username.</p>
                    </div>
                  </div>
                  <div className={styles.addFriendInputBox}>
                    <input
                      type="text"
                      className={styles.friendInput}
                      placeholder="Enter a username"
                      value={friendInput}
                      onChange={(e) => setFriendInput(e.target.value)}
                    />
                    <button className={`${styles.sendRequestBtn} ${friendInput ? styles.active : ""}`}>
                      Send Friend Request
                    </button>
                  </div>
                </div>
                <div className={styles.otherPlaces}>
                  <h2 className={styles.addFriendTitle}>Your Servers</h2>
                  <p className={styles.addFriendDesc}>You are a member of {servers.length} server{servers.length !== 1 ? "s" : ""}.</p>
                </div>
              </div>
              <aside className={styles.activeNow}>
                <h3 className={styles.activeNowTitle}>Active Now</h3>
                <div className={styles.emptyActiveCard}>
                  <h4 className={styles.emptyActiveTitle}>It's quiet for now...</h4>
                  <p className={styles.emptyActiveText}>When a friend starts an activity—like playing a game or hanging out on voice—we'll show it here!</p>
                </div>
              </aside>
            </div>
          </>
        ) : (
          <>
            <header className={styles.topHeader}>
              <div className={styles.headerLeft}>
                <span className={styles.hash} style={{ marginRight: 8 }}>#</span>
                <span className={styles.headerTitle}>{activeChannelName}</span>
              </div>
              <div className={styles.headerRight}>
                <span className={styles.memberCount}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v2h20v-2c0-3.33-6.67-5-10-5z" /></svg>
                  {members.length}
                </span>
              </div>
            </header>

            <div className={styles.chatLayout}>
              {/* Messages area */}
              <div className={styles.chatArea}>
                <div className={styles.messageList}>
                  {messages.length === 0 && (
                    <div className={styles.welcomeMsg}>
                      <div className={styles.welcomeHash}>#</div>
                      <h2 className={styles.welcomeTitle}>Welcome to #{activeChannelName}!</h2>
                      <p className={styles.welcomeDesc}>This is the start of the #{activeChannelName} channel.</p>
                    </div>
                  )}
                  {messages.map((msg) => (
                    msg.type === "system" ? (
                      <div key={msg.id} className={styles.systemMsg}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13 12H3" /></svg>
                        <span>{msg.content}</span>
                        <span className={styles.msgTimestamp}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ) : (
                      <div key={msg.id} className={styles.message}>
                        <div className={styles.msgAvatarCircle} style={{
                          background: msg.authorId === userId ? '#5865f2' : '#23a559'
                        }}>
                          {msg.authorName?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <div className={styles.msgContent}>
                          <div className={styles.msgHeader}>
                            <span className={styles.msgAuthor} style={{
                              color: msg.authorId === userId ? '#949cf7' : '#57f287'
                            }}>
                              {msg.authorName}
                            </span>
                            <span className={styles.msgTimestamp}>
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className={styles.msgBody}>{msg.content}</p>
                        </div>
                      </div>
                    )
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Message input */}
                <form className={styles.chatInputBar} onSubmit={sendMessage}>
                  <input
                    type="text"
                    className={styles.chatInput}
                    placeholder={`Message #${activeChannelName}`}
                    value={msgInput}
                    onChange={(e) => setMsgInput(e.target.value)}
                  />
                  <button type="submit" className={styles.sendBtn} disabled={!msgInput.trim()}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                  </button>
                </form>
              </div>

              {/* Members sidebar */}
              <aside className={styles.membersSidebar}>
                <div className={styles.membersHeader}>
                  Members — {members.length}
                </div>
                {members.map((m) => (
                  <div key={m.id} className={styles.memberItem}>
                    <div className={styles.memberAvatarWrap}>
                      <div className={styles.memberAvatar} style={{
                        background: m.id === serverData?.ownerId ? '#5865f2' : '#23a559'
                      }}>
                        {m.username.charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.memberDot}></div>
                    </div>
                    <span className={styles.memberName}>{m.username}</span>
                    {m.id === serverData?.ownerId && (
                      <span className={styles.ownerBadge}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#faa61a"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" /></svg>
                      </span>
                    )}
                  </div>
                ))}
              </aside>
            </div>
          </>
        )}
      </main>

      {showSettings && <UserSettings onClose={() => setShowSettings(false)} />}
      {isServerModalOpen && (
        <CreateServerModal
          onClose={() => setIsServerModalOpen(false)}
          onCreated={onServerCreated}
        />
      )}

      {/* Toast notification */}
      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}