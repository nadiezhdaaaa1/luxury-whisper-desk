-- Repoint blog cover images to static files under public/covers/.
-- These are host-independent static assets, chosen over the /__l5e/ asset CDN
-- so covers resolve on any host rather than only on Lovable's.
UPDATE public.posts SET cover_image_url = $$/covers/are-watches-and-bags-an-asset.webp$$ WHERE slug = $$are-watches-and-bags-an-asset$$;
UPDATE public.posts SET cover_image_url = $$/covers/do-watches-bags-jewelry-hold-value.webp$$ WHERE slug = $$do-watches-bags-jewelry-hold-value$$;
UPDATE public.posts SET cover_image_url = $$/covers/how-to-catch-sales-and-drops.webp$$ WHERE slug = $$how-to-catch-sales-and-drops$$;
UPDATE public.posts SET cover_image_url = $$/covers/how-to-track-collection-value.webp$$ WHERE slug = $$how-to-track-collection-value$$;
UPDATE public.posts SET cover_image_url = $$/covers/retail-vs-resale-price.webp$$ WHERE slug = $$retail-vs-resale-price$$;
UPDATE public.posts SET cover_image_url = $$/covers/track-collection-value-without-spreadsheet.webp$$ WHERE slug = $$track-collection-value-without-spreadsheet$$;
UPDATE public.posts SET cover_image_url = $$/covers/watch-buying-guide-for-beginners.webp$$ WHERE slug = $$watch-buying-guide-for-beginners$$;
UPDATE public.posts SET cover_image_url = $$/covers/what-makes-jewelry-valuable.webp$$ WHERE slug = $$what-makes-jewelry-valuable$$;
UPDATE public.posts SET cover_image_url = $$/covers/which-bags-hold-their-value.webp$$ WHERE slug = $$which-bags-hold-their-value$$;
UPDATE public.posts SET cover_image_url = $$/covers/why-retail-prices-keep-rising.webp$$ WHERE slug = $$why-retail-prices-keep-rising$$;