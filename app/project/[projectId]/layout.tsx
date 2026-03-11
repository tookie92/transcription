
const Projectlayout = ({children}:{children:React.ReactNode}) => {
  return (  
    <main className="flex w-full min-h-dvh bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {children}
    </main>
  )
}

export default Projectlayout