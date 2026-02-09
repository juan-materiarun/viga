-- Create API Collections Table
CREATE TABLE IF NOT EXISTS public.api_collections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create API Requests Table
CREATE TABLE IF NOT EXISTS public.api_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    collection_id UUID REFERENCES public.api_collections(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    method TEXT NOT NULL DEFAULT 'GET',
    url TEXT NOT NULL,
    headers JSONB DEFAULT '{}'::jsonb,
    body TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_requests ENABLE ROW LEVEL SECURITY;

-- Policies for Collections
CREATE POLICY "Users can view their own collections"
    ON public.api_collections FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own collections"
    ON public.api_collections FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections"
    ON public.api_collections FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections"
    ON public.api_collections FOR DELETE
    USING (auth.uid() = user_id);

-- Policies for Requests (via Collection ownership)
CREATE POLICY "Users can view requests in their collections"
    ON public.api_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.api_collections c
            WHERE c.id = api_requests.collection_id AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert requests in their collections"
    ON public.api_requests FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.api_collections c
            WHERE c.id = api_requests.collection_id AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update requests in their collections"
    ON public.api_requests FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.api_collections c
            WHERE c.id = api_requests.collection_id AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete requests in their collections"
    ON public.api_requests FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.api_collections c
            WHERE c.id = api_requests.collection_id AND c.user_id = auth.uid()
        )
    );

-- Add indexes
CREATE INDEX idx_api_collections_user ON public.api_collections(user_id);
CREATE INDEX idx_api_requests_collection ON public.api_requests(collection_id);
