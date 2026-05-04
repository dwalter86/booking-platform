'use client';

import { useState, useEffect } from 'react';

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export default function SlugInput({ defaultName = '', defaultSlug = '', hintText = '' }) {
  const [slug, setSlug] = useState(defaultSlug || slugify(defaultName));
  const [touched, setTouched] = useState(!!defaultSlug);

  useEffect(() => {
    if (!touched) {
      setSlug(slugify(defaultName));
    }
  }, [defaultName, touched]);

  function handleNameChange(e) {
    if (!touched) {
      setSlug(slugify(e.target.value));
    }
  }

  function handleSlugChange(e) {
    setTouched(true);
    setSlug(slugify(e.target.value));
  }

  function handleSlugBlur(e) {
    setSlug(slugify(e.target.value));
  }

  return (
    <>
      <div className="col-md-6">
        <label className="form-label">Name</label>
        <input
          className="form-control"
          type="text"
          name="name"
          defaultValue={defaultName}
          onChange={handleNameChange}
          required
          autoFocus
        />
      </div>
      <div className="col-md-6">
        <label className="form-label">Slug</label>
        <input
          className="form-control"
          type="text"
          name="slug"
          value={slug}
          onChange={handleSlugChange}
          onBlur={handleSlugBlur}
          required
        />
        <div className="form-text">
          {hintText || 'Auto-generated from name. Edit if needed.'}
        </div>
      </div>
    </>
  );
}
