const { createClient } = require('@supabase/supabase-js');

class SupabaseClient {
  constructor() {
    this.client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }

  // 用户管理
  async createUser(userData) {
    const { data, error } = await this.client
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getUser(userId) {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getAllUsers() {
    const { data, error } = await this.client
      .from('users')
      .select('*');

    if (error) throw error;
    return data || [];
  }

  // 房间管理
  async createRoom(roomData) {
    const { data, error } = await this.client
      .from('rooms')
      .insert(roomData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getAllRooms() {
    const { data, error } = await this.client
      .from('rooms')
      .select('*');

    if (error) throw error;
    return data || [];
  }

  async getRoomByRoomId(roomId) {
    const { data, error } = await this.client
      .from('rooms')
      .select('*')
      .eq('room_id', roomId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // 文件元数据
  async createFile(fileData) {
    const { data, error } = await this.client
      .from('files')
      .insert(fileData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // 聊天历史
  async saveChatMessage(messageData) {
    const { data, error } = await this.client
      .from('chat_messages')
      .insert(messageData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getChatHistory(roomId, limit = 100) {
    const { data, error } = await this.client
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data.reverse();
  }

  // 扫描任务
  async createScanTask(taskData) {
    const { data, error } = await this.client
      .from('scan_tasks')
      .insert(taskData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateScanTask(taskId, updates) {
    const { data, error } = await this.client
      .from('scan_tasks')
      .update(updates)
      .eq('task_id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new SupabaseClient();
    }
    return instance;
  },
  SupabaseClient
};
