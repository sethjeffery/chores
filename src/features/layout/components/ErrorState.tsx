import { ExclamationMarkIcon } from "@phosphor-icons/react";

export default function ErrorState({ error }: { error: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      <div className="bg-white rounded-xl p-8 shadow-xl max-w-md w-full text-center">
        <div className="bg-red-100 p-3 rounded-full inline-flex mb-4">
          <ExclamationMarkIcon className="h-6 w-6 text-red-500" weight="bold" />
        </div>
        <h2 className="text-xl font-medium text-gray-700">
          Error Loading Data
        </h2>
        <p className="text-gray-500 mt-2">{error}</p>
        <div className="mt-4 bg-yellow-50 p-3 rounded-lg text-yellow-800 text-sm text-left">
          <p className="font-medium">Possible causes:</p>
          <ul className="list-disc ml-5 mt-1 space-y-1">
            <li>Supabase tables not created - Check Supabase dashboard</li>
            <li>Database access issues - Check your Supabase configuration</li>
            <li>
              Network connectivity issues - Check your internet connection
            </li>
          </ul>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
