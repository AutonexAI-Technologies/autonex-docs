'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

function Inner() {
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    if (searchParams.get('access_denied') === '1') {
      toast({
        variant: 'destructive',
        title: '🔒 Access Restricted',
        description: "You don't have permission to access that page.",
      })
    }
  }, [searchParams, toast])

  return null
}

export default function AccessDeniedToast() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  )
}
