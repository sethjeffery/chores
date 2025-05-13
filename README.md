# Chores - A Family Task Manager

A simple Kanban-style board for managing family chores. Assign tasks to family members and track their progress across three columns:

- Ideas: For planning future chores
- To Do: Current tasks that need to be done
- Done: Completed chores

## Features

- Create chores and assign them to family members
- Drag and drop chores between columns
- Touch support for mobile devices
- Group chores by family member
- Add emoji icons and monetary rewards to chores
- Track total rewards earned by each family member
- Responsive design for mobile and desktop
- Cloud storage with Supabase

## Supabase Setup

To set up Supabase for data storage:

1. Create a Supabase account at https://supabase.com
2. Create a new project
3. In the Supabase dashboard, go to SQL Editor
4. Run the following SQL to create the chores table:

```sql
CREATE TABLE chores (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  assignee TEXT,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reward NUMERIC,
  icon TEXT
);
```

5. Get your Supabase URL and anon key from the API settings
6. Create a `.env.local` file in the root directory with:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_KEY=your-anon-key
```

## Tech Stack

- React 19 with TypeScript
- Vite for fast development
- Tailwind CSS for styling
- Supabase for cloud storage

## Getting Started

### Prerequisites

- Node.js v22 or higher
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create `.env.local` with your Supabase credentials
4. Start the development server:

```bash
npm run dev
```

5. Open your browser and navigate to the URL shown in your terminal (usually http://localhost:5173)

## Usage

- Click "Add New Chore" to create a new task
- Enter the chore description, emoji icon, and optional reward
- Assign it to a family member or leave unassigned in the Ideas column
- Drag and drop chores between columns (works with mouse or touch)
- Click the "✕" button to delete a chore

## Mobile Usage

The app now supports touch interaction for mobile devices:

- Touch and drag chores between columns
- Drag chores to family members to reassign them
- Visual feedback during drag operations
- Works on phones and tablets

## License

MIT
