import { useEffect, useState } from "react";
import { roomService } from "../services/roomService";

interface Room {
  _id: string;
  name: string;
  description?: string;
  participants: any[];
  messageCount?: number;
  lastActivity?: string;
}

interface ListRoomProps {
  onRoomSelect: (roomName: string) => void;
  activeRoom?: string;
}

const ListRoom = ({ onRoomSelect, activeRoom }: ListRoomProps) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [roomForm, setRoomForm] = useState({
    name: '',
    description: '',
    roomType: 'public',
    maxParticipants: 0
  });

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setIsLoading(true);
        const res = await roomService.getRooms();
        console.log("Fetched rooms:", res);
        setRooms(res.rooms || []);
      } catch (error) {
        console.error("Error fetching rooms:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRooms();
  }, []);

  const handleCreateNewRoom = () => {
    setIsDialogOpen(true);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await roomService.createRoom(roomForm);
      setIsDialogOpen(false);
      setRoomForm({ name: '', description: '', roomType: 'public', maxParticipants: 0 });
    } catch (error) {
      console.error('Error creating room:', error);
    }
  };

  const handleRoomClick = (roomName: string) => {
    onRoomSelect(roomName);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with New Room button */}
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-semibold">Messages</h2>
        <button 
          onClick={handleCreateNewRoom}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm"
        >
          New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-2">
          {isLoading ? (
            <div className="text-center p-4 text-gray-500">
              Loading rooms...
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center p-4 text-gray-500">
              No rooms available
            </div>
          ) : (
            rooms.map((room) => (
              <div
                key={room._id}
                className={`p-3 cursor-pointer rounded-md border-b transition-colors ${
                  activeRoom === room.name
                    ? "bg-blue-100 border-blue-300"
                    : "hover:bg-gray-100"
                }`}
                onClick={() => handleRoomClick(room.name)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRoomClick(room.name);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <h3 className="font-medium">{room.name}</h3>
                {room.description && (
                  <p className="text-sm text-gray-500">{room.description}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Room Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New Room</h3>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label htmlFor="room-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Room Name
                </label>
                <input
                  id="room-name"
                  type="text"
                  value={roomForm.name}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="room-description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="room-description"
                  value={roomForm.description}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div>
                <label htmlFor="room-type" className="block text-sm font-medium text-gray-700 mb-1">
                  Room Type
                </label>
                <select
                  id="room-type"
                  value={roomForm.roomType}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, roomType: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
              <div>
                <label htmlFor="max-participants" className="block text-sm font-medium text-gray-700 mb-1">
                  Max Participants
                </label>
                <input
                  id="max-participants"
                  type="number"
                  value={roomForm.maxParticipants}
                  onChange={(e) =>
                    setRoomForm({
                      ...roomForm,
                      maxParticipants: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsDialogOpen(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Create Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListRoom;
