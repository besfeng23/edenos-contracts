export const handler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "EdenOS Gateway - Ready for migration" })
  };
};