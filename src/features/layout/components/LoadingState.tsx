export default function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      <div className="bg-white rounded-xl p-8 shadow-xl max-w-md w-full text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-medium text-gray-700">Loading ...</h2>
        <p className="text-gray-500 mt-2">Getting all the bunnies ready...</p>
      </div>
    </div>
  );
}
