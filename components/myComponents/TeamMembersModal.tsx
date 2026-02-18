"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, useUser } from "@clerk/nextjs";
import { 
  Users, 
  Mail, 
  UserPlus, 
  X, 
  Check, 
  Clock, 
  Crown, 
  Shield, 
  Eye,
  Loader2,
  Search,
  MoreHorizontal,
  Trash2,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";

interface TeamMembersModalProps {
  projectId: Id<"projects">;
  projectName: string;
  isOwner: boolean;
}

type MemberRole = "owner" | "editor" | "viewer";
type MemberStatus = "active" | "pending";

interface TeamMember {
  userId: string;
  name: string;
  email?: string;
  role: MemberRole;
  status: MemberStatus;
  avatar?: string;
  joinedAt?: number;
}

export function TeamMembersModal({ projectId, projectName, isOwner }: TeamMembersModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [selectedRole, setSelectedRole] = useState<MemberRole>("editor");
  const [isInviting, setIsInviting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Clerk user info
  const { user } = useUser();
  const currentUserName = user?.fullName || user?.username || null;

  // Fetch project to get members
  const project = useQuery(api.projects.getById, { projectId, withNames: true });
  const inviteUser = useMutation(api.projects.inviteUser);
  const removeMember = useMutation(api.projects.removeMember);
  const fixCurrentUserMember = useMutation(api.projects.fixCurrentUserMember);
  const migrateMembersInfo = useMutation(api.projects.migrateMembersInfo);

  // Build members list from project data
  const members: TeamMember[] = project?.members?.map(m => ({
    userId: m.userId,
    name: m.name || m.userId,
    email: m.email,
    role: m.role as MemberRole,
    status: "active" as MemberStatus,
  })) || [];

  // Migration mutation
  const [isMigrating, setIsMigrating] = useState(false);

  const handleMigrate = async () => {
    setIsMigrating(true);
    try {
      const result = await migrateMembersInfo();
      toast.success(`Migration completed: ${result.updatedProjects} projects updated`);
    } catch (error) {
      toast.error("Migration failed");
    } finally {
      setIsMigrating(false);
    }
  };

  const handleFixMyInfo = async () => {
    try {
      await fixCurrentUserMember({ projectId });
      toast.success("Your info has been updated");
    } catch (error) {
      toast.error("Failed to update info");
    }
  };

  // Add pending invitations (mock for now - would come from a separate query)
  const pendingInvitations: TeamMember[] = [];

  const allMembers = [...members, ...pendingInvitations];
  const filteredMembers = allMembers.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInvite = async () => {
    if (!email || !name) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsInviting(true);
    try {
      await inviteUser({
        projectId,
        email,
        name,
        role: selectedRole as "editor" | "viewer",
      });
      
      toast.success(`Invitation sent to ${email}`);
      setEmail("");
      setName("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!isOwner) return;
    
    try {
      await removeMember({ projectId, userId });
      toast.success("Member removed");
    } catch (error) {
      toast.error("Failed to remove member");
    }
  };

  const getRoleIcon = (role: MemberRole) => {
    switch (role) {
      case "owner": return <Crown className="w-4 h-4 text-amber-500" />;
      case "editor": return <Shield className="w-4 h-4 text-blue-500" />;
      case "viewer": return <Eye className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleColor = (role: MemberRole) => {
    switch (role) {
      case "owner": return "bg-amber-50 text-amber-700 border-amber-200";
      case "editor": return "bg-blue-50 text-blue-700 border-blue-200";
      case "viewer": return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Users className="w-4 h-4" />
          Team
          <span className="ml-1 px-2 py-0.5 bg-gray-100 text-xs rounded-full">
            {members.length}
          </span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md w-full p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-linear-to-r from-[#3D7C6F] to-[#2d5f54] p-6 text-white">
          <DialogHeader className="text-white">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Members
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/80 text-sm mt-1">
            {projectName} • {members.length} members
          </p>
        </div>

        <div className="p-4 space-y-4">
          {/* Invite Form */}
          {isOwner && (
            <div className="p-4 bg-gray-50 rounded-xl space-y-3">
              <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Invite new member
              </p>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                />
              </div>

              {/* Role Selector */}
              <div className="flex gap-2">
                {(["viewer", "editor"] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`
                      flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all
                      ${selectedRole === role 
                        ? getRoleColor(role) 
                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                      }
                    `}
                  >
                    {getRoleIcon(role)}
                    <span className="capitalize">{role}</span>
                  </button>
                ))}
              </div>

              <Button
                onClick={handleInvite}
                disabled={isInviting || !email || !name}
                className="w-full bg-[#3D7C6F] hover:bg-[#2d5f54]"
              >
                {isInviting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Send Invitation
              </Button>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Members List */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            <AnimatePresence>
              {filteredMembers.map((member, index) => (
                <motion.div
                  key={member.userId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`
                    flex items-center gap-3 p-3 rounded-xl border-2 transition-all
                    ${member.role === "owner" ? "bg-amber-50 border-amber-200" : "bg-white border-gray-100 hover:border-gray-200"}
                  `}
                >
                  {/* Avatar */}
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm
                    ${member.role === "owner" ? "bg-linear-to-br from-amber-400 to-amber-600" : 
                      member.role === "editor" ? "bg-linear-to-br from-blue-400 to-blue-600" : 
                      "bg-linear-to-br from-gray-400 to-gray-600"}
                  `}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {member.name}
                      {member.role === "owner" && (
                        <Crown className="inline w-4 h-4 text-amber-500 ml-1" />
                      )}
                      {member.role === "owner" && member.name === member.userId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 h-6 px-1 text-xs text-blue-600 hover:text-blue-700"
                          onClick={handleFixMyInfo}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Fix
                        </Button>
                      )}
                    </p>
                    {member.email && (
                      <p className="text-xs text-gray-500 truncate">{member.email}</p>
                    )}
                  </div>

                  {/* Role Badge */}
                  <div className={`px-2 py-1 rounded-lg text-xs font-medium border ${getRoleColor(member.role)}`}>
                    {getRoleIcon(member.role)}
                    <span className="ml-1 capitalize">{member.role}</span>
                  </div>

                  {/* Status */}
                  {member.status === "pending" && (
                    <span className="flex items-center gap-1 text-xs text-orange-500">
                      <Clock className="w-3 h-3" />
                      Pending
                    </span>
                  )}

                  {/* Remove Button */}
                  {isOwner && member.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-red-500 hover:bg-red-50"
                      onClick={() => handleRemove(member.userId)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredMembers.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No members found</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500">
              {isOwner ? "You can invite up to 5 team members" : "Contact the owner to invite more members"}
            </p>
            {isOwner && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-blue-600 hover:text-blue-700 h-6 px-2"
                onClick={handleMigrate}
                disabled={isMigrating}
              >
                {isMigrating ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="w-3 h-3 mr-1" />
                )}
                Fix names
              </Button>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
